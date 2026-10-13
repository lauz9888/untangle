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
  taskOpenButton,
  taskDetailModal,
  taskDetailDiscardDialog,
  taskDetailDeleteDialog,
  taskDoneToggle,
  makeTask,
  seedTasks,
  celebration,
  celebrationClose,
  confettiPieces,
  completedButton,
  completedPanel,
  completedRowButton,
} from './helpers'

// Scope to actual WCAG 2.1 A/AA success criteria, not axe-core's broader
// "best-practice" rule set. Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const TASKS_STORAGE_KEY = 'untangle:tasks'

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

test('has no violations with the Completed panel populated (done tasks)', async ({ page }) => {
  await seedTasks(page, [
    makeTask({ id: 1, name: 'Read a book', done: true, updatedAt: 2000 }),
    makeTask({ id: 2, name: 'Water the plants', done: true, updatedAt: 1000, createdAt: 2000 }),
  ])
  await page.reload()
  await completedButton(page).click()
  await expect(completedPanel(page)).toBeVisible()
  await expect(completedPanel(page).getByRole('listitem')).toHaveCount(2)

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Completed panel empty', async ({ page }) => {
  await completedButton(page).click()
  await expect(completedPanel(page)).toBeVisible()
  await expect(completedPanel(page).getByText('No completed tasks yet')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations on the header with the Completed button showing a non-zero count', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Read a book', done: true })])
  await page.reload()
  await expect(completedButton(page)).toHaveText('Completed (1)')

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the celebration visible and confetti in flight', async ({ page }) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Read a book' })])
  await page.reload()
  await taskDoneToggle(page, 'Read a book').click()
  await expect(celebration(page)).toBeVisible()
  await expect(confettiPieces(page).first()).toBeAttached()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the celebration close button focused', async ({ page }) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Read a book' })])
  await page.reload()
  await taskDoneToggle(page, 'Read a book').click()
  await celebrationClose(page).focus()
  await expect(celebrationClose(page)).toBeFocused()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with Task Detail stacked on top of the Completed panel', async ({
  page,
}) => {
  await seedTasks(page, [
    makeTask({ id: 1, name: 'Plan launch', done: true, description: 'Coordinate with marketing' }),
  ])
  await page.reload()
  await completedButton(page).click()
  await completedRowButton(page, 'Plan launch').click()
  await expect(taskDetailModal(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the task detail view open, fields populated, and two sub-tasks', async ({
  page,
}) => {
  await page.evaluate(({ key, task }) => localStorage.setItem(key, JSON.stringify([task])), {
    key: TASKS_STORAGE_KEY,
    task: makeTask({
      id: 1,
      name: 'Plan launch',
      description: 'Coordinate with marketing',
      energyLevel: 'high',
      estimate: { days: 2, hours: 3, minutes: 15 },
      availableFrom: '2026-09-01',
      dueBy: '2026-09-10',
      subTasks: [
        { id: 1, text: 'Draft brief', done: false },
        { id: 2, text: 'Send invites', done: true },
      ],
    }),
  })
  await page.reload()

  await taskOpenButton(page, 'Plan launch').click()
  await expect(taskDetailModal(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the task detail discard-confirmation dialog open', async ({
  page,
}) => {
  await page.evaluate(({ key, task }) => localStorage.setItem(key, JSON.stringify([task])), {
    key: TASKS_STORAGE_KEY,
    task: makeTask({ id: 1, name: 'Plan launch' }),
  })
  await page.reload()

  await taskOpenButton(page, 'Plan launch').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Changed name')
  await page.keyboard.press('Escape')
  await expect(taskDetailDiscardDialog(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the task detail delete-confirmation dialog open', async ({ page }) => {
  await page.evaluate(({ key, task }) => localStorage.setItem(key, JSON.stringify([task])), {
    key: TASKS_STORAGE_KEY,
    task: makeTask({ id: 1, name: 'Plan launch' }),
  })
  await page.reload()

  await taskOpenButton(page, 'Plan launch').click()
  const modal = taskDetailModal(page)
  await modal.getByRole('button', { name: 'Delete task', exact: true }).click()
  await expect(taskDetailDeleteDialog(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test.describe('header action buttons at 320x812 with 999 completed tasks', () => {
  test.use({ viewport: { width: 320, height: 812 } })

  test('has no violations', async ({ page }) => {
    await seedTasks(
      page,
      Array.from({ length: 999 }, (_, i) =>
        makeTask({ id: i + 1, name: `Done ${i + 1}`, done: true, createdAt: 1000 + i })
      )
    )
    await page.reload()
    await expect(completedButton(page)).toHaveText('Completed (999)')

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('wrapped header at 700x900 with 999 completed tasks', () => {
  test.use({ viewport: { width: 700, height: 900 } })

  test('has no violations', async ({ page }) => {
    await seedTasks(
      page,
      Array.from({ length: 999 }, (_, i) =>
        makeTask({ id: i + 1, name: `Done ${i + 1}`, done: true, createdAt: 1000 + i })
      )
    )
    await page.reload()
    await expect(completedButton(page)).toHaveText('Completed (999)')

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
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
