import type { Locator, Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import {
  addTaskButton,
  completedButtonAlways,
  encourageButton,
  energyButton,
  makeTask,
  seedTasks,
  toughLoveButton,
} from './helpers'

const WIDTHS = [641, 650, 700, 768, 800, 900, 1024, 1280]
const COUNTS = [0, 9, 99, 999]
const HEIGHT = 900

async function seedCompleted(page: Page, count: number) {
  await seedTasks(
    page,
    Array.from({ length: count }, (_, i) =>
      makeTask({ id: i + 1, name: `Done ${i + 1}`, done: true, createdAt: 1000 + i })
    )
  )
  await page.reload()
}

async function box(locator: Locator) {
  const b = await locator.boundingBox()
  if (!b) throw new Error('element has no bounding box')
  return b
}

function headerControls(page: Page): Locator[] {
  return [
    energyButton(page, 'Low'),
    energyButton(page, 'Medium'),
    energyButton(page, 'High'),
    encourageButton(page),
    toughLoveButton(page),
    completedButtonAlways(page),
    addTaskButton(page),
  ]
}

// Req 18/19: the board starts at or below the header and every header control.
async function expectBoardClearsHeader(page: Page) {
  const header = await box(page.locator('#app-header'))
  const board = await box(page.locator('.now-next-later-board'))
  expect(board.y).toBeGreaterThanOrEqual(header.y + header.height - 0.5)
  for (const control of headerControls(page)) {
    const b = await box(control)
    expect(board.y).toBeGreaterThanOrEqual(b.y + b.height - 0.5)
  }
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )
  expect(noOverflow).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('board clears the header above 640px (Req 18, 19)', () => {
  for (const width of WIDTHS) {
    test(`${width}px: board top is at or below the header for Completed counts ${COUNTS.join('/')}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      for (const count of COUNTS) {
        await seedCompleted(page, count)
        await expect(completedButtonAlways(page)).toHaveText(`Completed (${count})`)
        await expectBoardClearsHeader(page)
      }
    })
  }

  for (const width of [700, 1280]) {
    test(`${width}px: still clear after selecting an energy level`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      await seedCompleted(page, 999)
      await energyButton(page, 'Low').click()
      await expectBoardClearsHeader(page)
    })
  }
})

test.describe('board position when the header fits on one line (Req 20)', () => {
  for (const width of [1024, 1280]) {
    test(`${width}px: board top stays within 16px of 96px`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      await seedCompleted(page, 999)
      const board = await box(page.locator('.now-next-later-board'))
      expect(Math.abs(board.y - 96)).toBeLessThanOrEqual(16)
    })
  }
})

test.describe('640/641 boundary (Req 21)', () => {
  for (const width of [640, 641]) {
    test(`${width}px: gap between header and board is non-negative and not doubled`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      await seedCompleted(page, 999)
      const header = await box(page.locator('#app-header'))
      const board = await box(page.locator('.now-next-later-board'))
      const gap = board.y - (header.y + header.height)
      expect(gap).toBeGreaterThanOrEqual(0)
      expect(gap).toBeLessThanOrEqual(32)
    })
  }
})

// Req 7: above 640px the header must sit exactly where the old absolutely
// positioned .brand put it. Font-independent A/B check: measure the current
// layout, temporarily inject the pre-change rules, measure again, and compare.
test.describe('header position is unchanged above 640px (Req 7)', () => {
  for (const width of [1280, 700]) {
    test(`${width}px: logo and Completed button sit where they did before`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHT })
      await page.reload()
      const measure = async () => ({
        logo: await box(page.locator('.logo')),
        completed: await box(completedButtonAlways(page)),
      })

      const current = await measure()

      const legacy = await page.addStyleTag({
        content: `.brand {
          position: absolute !important;
          top: 1.5rem !important;
          left: 1.5rem !important;
          right: 1.5rem !important;
          margin: 0 !important;
          padding: 0 !important;
        }`,
      })
      const before = await measure()
      await legacy.evaluate((el) => (el as Element).remove())

      for (const key of ['logo', 'completed'] as const) {
        expect(Math.abs(current[key].x - before[key].x)).toBeLessThanOrEqual(1)
        expect(Math.abs(current[key].y - before[key].y)).toBeLessThanOrEqual(1)
      }
    })
  }

  test('header content left edge is x=24', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: HEIGHT })
    const logo = await box(page.locator('.logo'))
    expect(logo.x).toBeCloseTo(24, 0)
  })

  test('900px: the header is wrapped (Completed sits on a row below the logo)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: HEIGHT })
    const logo = await box(page.locator('.logo'))
    const completed = await box(completedButtonAlways(page))
    expect(completed.y).toBeGreaterThanOrEqual(logo.y + logo.height)
  })

  test('1024px: buttons share one line with the logo', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: HEIGHT })
    const logo = await box(page.locator('.logo'))
    for (const l of [encourageButton(page), toughLoveButton(page), completedButtonAlways(page)]) {
      const b = await box(l)
      expect(b.y).toBeLessThan(logo.y + logo.height)
    }
  })
})
