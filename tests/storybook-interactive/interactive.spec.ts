import { test, expect, type Page, type Locator } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
// Single source of truth for the mobile sizes, shared with .storybook/preview.ts.
import { UNTANGLE_VIEWPORTS } from '../../.storybook/viewports'

// Interactive-view health check (ADR 0008): every story of the static
// Storybook build must render and run its play function without error events,
// exactly as it would in `npm run storybook`.

const REQUIRED_TITLES = [
  'Components/AddTaskButton',
  'Components/AddTaskModal',
  'Components/CelebrationNotification',
  'Components/CloseConfirmDialog',
  'Components/CollapsibleSection',
  'Components/CompletedButton',
  'Components/CompletedTasksPanel',
  'Components/ConfettiLayer',
  'Components/EncourageButton',
  'Components/EnergySelector',
  'Components/NowNextLaterBoard',
  'Components/TaskDetailDeleteDialog',
  'Components/TaskDetailDiscardDialog',
  'Components/TaskDetailModal',
  'Components/ToastNotification',
  'Components/ToughLoveButton',
]

// Every story that sets globals.viewport, and which named viewport it uses.
const MOBILE_STORIES: Record<string, keyof typeof UNTANGLE_VIEWPORTS> = {
  'components-celebrationnotification--mobile': 'untangleMobileLarge',
  'components-collapsiblesection--interactions': 'untangleMobile',
  'components-completedtaskspanel--mobile-long': 'untangleMobileLarge',
  'components-encouragebutton--mobile-focus-ring': 'untangleMobile',
  'components-nownextlaterboard--mixed-collapsed-expanded': 'untangleMobile',
  'components-toughlovebutton--mobile-focus-ring': 'untangleMobile',
}

// Stories whose content depends on seeded mock data: they must not render blank.
const NON_BLANK: Record<string, (page: Page) => Locator> = {
  'components-nownextlaterboard--one-incomplete-task': (page) => page.getByText('Buy milk'),
  'components-taskdetailmodal--open': (page) => page.getByRole('dialog'),
  'components-completedtaskspanel--populated': (page) => page.locator('.completed-item').first(),
}

type SbEvent = { event: string; payload: unknown }
type IndexEntry = { id: string; title: string; type: string; importPath: string }

const ERROR_EVENTS = [
  'playFunctionThrewException',
  'storyErrored',
  'storyThrewException',
  'storyMissing',
]

async function loadIndex(baseURL: string): Promise<IndexEntry[]> {
  const res = await fetch(new URL('/index.json', baseURL))
  const json = (await res.json()) as { entries: Record<string, IndexEntry> }
  return Object.values(json.entries).filter((e) => e.type === 'story')
}

async function installEventRecorder(page: Page) {
  await page.addInitScript((errorEvents) => {
    const w = window as unknown as {
      __sbEvents: { event: string; payload: unknown }[]
      __STORYBOOK_ADDONS_CHANNEL__?: {
        on: (e: string, cb: (p: unknown) => void) => void
      }
    }
    w.__sbEvents = []
    const timer = setInterval(() => {
      const channel = w.__STORYBOOK_ADDONS_CHANNEL__
      if (!channel) return
      clearInterval(timer)
      for (const event of ['storyRendered', ...errorEvents]) {
        channel.on(event, (payload) => w.__sbEvents.push({ event, payload }))
      }
    }, 2)
  }, ERROR_EVENTS)
}

async function waitForOutcome(page: Page) {
  await page.waitForFunction(
    (errorEvents) =>
      (window as unknown as { __sbEvents: SbEvent[] }).__sbEvents.some(
        (e) => e.event === 'storyRendered' || errorEvents.includes(e.event)
      ),
    ERROR_EVENTS,
    { timeout: 15000 }
  )
  // Error events can follow storyRendered; let them land.
  await page.waitForTimeout(300)
}

async function errorsOf(page: Page): Promise<SbEvent[]> {
  const events = await page.evaluate(
    () => (window as unknown as { __sbEvents: SbEvent[] }).__sbEvents
  )
  return events.filter((e) => ERROR_EVENTS.includes(e.event))
}

function watchPageErrors(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (
      msg.type() === 'error' &&
      /Cannot read properties|Failed to fetch dynamically imported module/.test(msg.text())
    ) {
      problems.push(`console.error: ${msg.text()}`)
    }
  })
  return problems
}

let stories: IndexEntry[] = []

test.beforeAll(async ({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? process.env.STORYBOOK_URL
  stories = await loadIndex(baseURL as string)
})

test.describe('catalogue', () => {
  test('has at least 48 stories covering all 16 components', () => {
    expect(stories.length).toBeGreaterThanOrEqual(48)
    const titles = new Set(stories.map((s) => s.title))
    for (const title of REQUIRED_TITLES) expect(titles, title).toContain(title)
  })
})

test.describe('mobile viewport map drift guards', () => {
  test('every mapped mobile story exists in index.json', () => {
    const ids = new Set(stories.map((s) => s.id))
    for (const id of Object.keys(MOBILE_STORIES)) expect(ids, id).toContain(id)
  })

  test('story files setting a viewport match the spec-local map', () => {
    const byId = new Map(stories.map((s) => [s.id, s]))
    const expected = new Map<string, Map<string, number>>()
    for (const [id, name] of Object.entries(MOBILE_STORIES)) {
      const file = path.basename(byId.get(id)!.importPath)
      const counts = expected.get(file) ?? new Map<string, number>()
      counts.set(name, (counts.get(name) ?? 0) + 1)
      expected.set(file, counts)
    }

    const dir = path.resolve('src/components')
    const withViewport = new Map<string, Map<string, number>>()
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.stories.ts'))) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8')
      if (!src.includes('viewport: { value:')) continue
      const counts = new Map<string, number>()
      for (const m of src.matchAll(/viewport: \{ value: '([^']+)'/g)) {
        counts.set(m[1], (counts.get(m[1]) ?? 0) + 1)
      }
      withViewport.set(file, counts)
    }

    expect([...withViewport.keys()].sort()).toEqual([...expected.keys()].sort())
    for (const [file, counts] of withViewport) {
      expect(Object.fromEntries(counts), file).toEqual(Object.fromEntries(expected.get(file)!))
    }
  })
})

// Per-story tests must be registered synchronously, so read the story list
// from the static build on disk or, when pointed at a dev server, at runtime.
function storyIdsAtCollectionTime(): string[] {
  const file = path.resolve('storybook-static/index.json')
  if (!fs.existsSync(file)) return []
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    entries: Record<string, IndexEntry>
  }
  return Object.values(json.entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id)
}

for (const id of storyIdsAtCollectionTime()) {
  test(`story ${id} renders with no error events`, async ({ page }) => {
    const problems = watchPageErrors(page)
    await installEventRecorder(page)

    const vp = MOBILE_STORIES[id]
    if (vp) {
      const { width, height } = UNTANGLE_VIEWPORTS[vp].styles
      await page.setViewportSize({ width: parseInt(width), height: parseInt(height) })
    }

    await page.goto(`/iframe.html?id=${id}&viewMode=story`)
    await waitForOutcome(page)

    const errors = await errorsOf(page)
    expect(errors.map((e) => JSON.stringify(e.payload).slice(0, 600))).toEqual([])
    expect(problems).toEqual([])

    const nonBlank = NON_BLANK[id]
    if (nonBlank) await expect(nonBlank(page)).toBeVisible()
  })
}

test.describe('cross-story leakage', () => {
  test('navigating between stories in one page shows each story its own state', async ({
    page,
  }) => {
    await installEventRecorder(page)
    await page.goto(
      '/iframe.html?id=components-nownextlaterboard--one-incomplete-task&viewMode=story'
    )
    await waitForOutcome(page)
    await expect(page.getByText('Buy milk')).toBeVisible()

    const goTo = async (storyId: string) => {
      await page.evaluate(() => {
        ;(window as unknown as { __sbEvents: SbEvent[] }).__sbEvents = []
      })
      await page.evaluate((sid) => {
        const w = window as unknown as {
          __STORYBOOK_ADDONS_CHANNEL__: { emit: (e: string, p: unknown) => void }
        }
        w.__STORYBOOK_ADDONS_CHANNEL__.emit('setCurrentStory', {
          storyId: sid,
          viewMode: 'story',
        })
      }, storyId)
      await waitForOutcome(page)
      expect(await errorsOf(page)).toEqual([])
    }

    await goTo('components-nownextlaterboard--empty-sections')
    await expect(page.getByText('Buy milk')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Now' })).toBeVisible()

    await goTo('components-energyselector--interactions')
    await expect(page.getByRole('button', { name: 'Low' })).toBeVisible()

    await goTo('components-energyselector--unselected')
    await expect(page.getByRole('button', { name: 'Low' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Low', pressed: true })).toHaveCount(0)
    await expect(page.getByText('Buy milk')).toHaveCount(0)
  })
})
