import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './coverage-fixture'
import {
  energyButton,
  encourageButton,
  toughLoveButton,
  toast,
  sectionToggle,
  addTaskButton,
  addTaskModal,
  closeConfirmDialog,
} from './helpers'

// Scope to actual WCAG 2.1 A/AA success criteria, not axe-core's broader
// "best-practice" rule set. Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const TASKS_STORAGE_KEY = 'untangle:tasks'

// Local fixture builder mirroring design.md's Task shape (docs/adr/0003) — seeded directly into
// localStorage since the real useTasks.ts store doesn't exist yet.
function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Read a book',
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('home page has no detectable accessibility violations', async ({ page }) => {
  // Also covers the Now/Next/Later board's default desktop viewport, full-page,
  // all-expanded state (Requirement 15) — no separate test needed since the board
  // renders unconditionally as part of the home page.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with an energy-level toast showing', async ({ page }) => {
  await energyButton(page, 'Low').click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Encourage me toast showing', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Tough love toast showing', async ({ page }) => {
  await toughLoveButton(page).click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Add Task modal open (default state)', async ({ page }) => {
  await addTaskButton(page).click()
  await expect(addTaskModal(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the close-without-saving confirmation dialog open', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')
  await page.keyboard.press('Escape')
  await expect(closeConfirmDialog(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with an incomplete task rendered on the board', async ({ page }) => {
  await page.evaluate(({ key, task }) => localStorage.setItem(key, JSON.stringify([task])), {
    key: TASKS_STORAGE_KEY,
    task: makeTask({ done: false }),
  })
  await page.reload()
  await expect(page.getByRole('listitem')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with a completed (done: true) task rendered on the board', async ({
  page,
}) => {
  await page.evaluate(({ key, task }) => localStorage.setItem(key, JSON.stringify([task])), {
    key: TASKS_STORAGE_KEY,
    task: makeTask({ done: true }),
  })
  await page.reload()
  await expect(page.getByRole('listitem')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test.describe('Now/Next/Later sections at mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('has no violations with a section collapsed', async ({ page }) => {
    await sectionToggle(page, 'Now').click()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })

  test('has no violations with the Add Task modal open', async ({ page }) => {
    await addTaskButton(page).click()
    await expect(addTaskModal(page)).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})
