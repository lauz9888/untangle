import type { Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import {
  taskList,
  taskItem,
  taskOpenButton,
  taskDetailModal,
  taskDetailDiscardDialog,
  taskDetailDeleteDialog,
} from './helpers'

const TASKS_STORAGE_KEY = 'untangle:tasks'

// Local test fixture builder — mirrors the Task shape from useTasks.ts (docs/adr/0003), seeded
// directly into localStorage to exercise the store's hydration/rendering path in a real browser.
function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Task',
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

async function seedTasks(page: Page, tasks: Record<string, unknown>[]) {
  await page.evaluate(({ key, tasks }) => localStorage.setItem(key, JSON.stringify(tasks)), {
    key: TASKS_STORAGE_KEY,
    tasks,
  })
}

async function readTasks(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '[]') as Record<string, unknown>[],
    TASKS_STORAGE_KEY
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('selecting a task opens the detail dialog pre-filled with every field', async ({ page }) => {
  await seedTasks(page, [
    makeTask({
      id: 1,
      name: 'Plan launch',
      section: 'next',
      description: 'Coordinate with marketing',
      energyLevel: 'high',
      estimate: { days: 2, hours: 3, minutes: 15 },
      availableFrom: '2026-09-01',
      dueBy: '2026-09-10',
      subTasks: [
        { id: 1, text: 'Draft brief', done: false },
        { id: 2, text: 'Send invites', done: true },
      ],
      done: false,
    }),
  ])
  await page.reload()

  await taskOpenButton(page, 'Plan launch').click()
  const modal = taskDetailModal(page)
  await expect(modal).toBeVisible()

  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('Plan launch')
  await expect(modal.getByRole('button', { name: 'Next', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(modal.getByLabel('Description', { exact: true })).toHaveValue(
    'Coordinate with marketing'
  )
  await expect(modal.getByRole('button', { name: 'High', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(modal.getByLabel('Days', { exact: true })).toHaveValue('2')
  await expect(modal.getByLabel('Hrs', { exact: true })).toHaveValue('3')
  await expect(modal.getByLabel('Min', { exact: true })).toHaveValue('15')
  await expect(modal.getByLabel('Available from', { exact: true })).toHaveValue('2026-09-01')
  await expect(modal.getByLabel('Due by', { exact: true })).toHaveValue('2026-09-10')
  await expect(modal.getByRole('listitem')).toHaveCount(2)
  await expect(modal.getByLabel('Mark as done', { exact: true })).not.toBeChecked()
})

test('editing name and section, saving, updates the board without a reload and persists across a reload', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Draft memo').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Finalize memo')
  await modal.getByRole('button', { name: 'Later', exact: true }).click()
  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeHidden()
  await expect(taskList(page, 'later')).toContainText('Finalize memo')
  await expect(taskList(page, 'now')).toHaveCount(0)

  await page.reload()
  await expect(taskList(page, 'later')).toContainText('Finalize memo')
})

test('saving with an empty name shows the inline error, keeps the dialog open, and focuses the name field', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Draft memo').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('   ')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeVisible()
  await expect(modal.getByRole('alert')).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toBeFocused()
})

test('saving with dueBy before availableFrom shows the inline error and keeps the dialog open', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Draft memo').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Available from', { exact: true }).fill('2026-09-20')
  await modal.getByLabel('Due by', { exact: true }).fill('2026-09-10')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeVisible()
  await expect(modal.getByRole('alert')).toBeVisible()
})

test('deleting a task through the confirmation removes it from the board and localStorage', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Obsolete task', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Obsolete task').click()
  const modal = taskDetailModal(page)
  await modal.getByRole('button', { name: 'Delete task', exact: true }).click()

  const confirm = taskDetailDeleteDialog(page)
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'Yes', exact: true }).click()

  await expect(modal).toBeHidden()
  await expect(taskItem(page, 'Obsolete task')).toHaveCount(0)

  const tasks = await readTasks(page)
  expect(tasks).toHaveLength(0)
})

test('closing with unsaved edits shows the discard confirmation; confirming discards and returns focus to the open button', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  const opener = taskOpenButton(page, 'Draft memo')
  await opener.click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Changed name')

  await page.keyboard.press('Escape')

  const discard = taskDetailDiscardDialog(page)
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Yes', exact: true }).click()

  await expect(discard).toBeHidden()
  await expect(modal).toBeHidden()
  await expect(opener).toBeFocused()
  await expect(taskItem(page, 'Draft memo')).toBeVisible()
})

test('closing with unsaved edits and cancelling the discard returns to the dialog with focus on No', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Draft memo').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Changed name')

  await page.keyboard.press('Escape')
  const discard = taskDetailDiscardDialog(page)
  await expect(discard).toBeVisible()

  await expect(discard.getByRole('button', { name: 'No', exact: true })).toBeFocused()
  await discard.getByRole('button', { name: 'No', exact: true }).click()

  await expect(discard).toBeHidden()
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('Changed name')
})

test('closing with no edits closes immediately with no discard confirmation shown', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  const opener = taskOpenButton(page, 'Draft memo')
  await opener.click()
  const modal = taskDetailModal(page)

  await page.keyboard.press('Escape')

  await expect(modal).toBeHidden()
  await expect(taskDetailDiscardDialog(page)).toBeHidden()
  await expect(opener).toBeFocused()
})

test('ticking the done checkbox in the detail view closes the dialog and removes the task from the board without a reload', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Water plants', section: 'now', done: false })])
  await page.reload()

  await taskOpenButton(page, 'Water plants').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel('Mark as done', { exact: true }).click()

  await expect(modal).toBeHidden()
  await expect(taskDetailDiscardDialog(page)).toHaveCount(0)
  await expect(taskItem(page, 'Water plants')).toHaveCount(0)

  const tasks = await readTasks(page)
  expect(tasks[0]!.done).toBe(true)
})

test('toggling a sub-task done checkbox in the detail view persists across a reload', async ({
  page,
}) => {
  await seedTasks(page, [
    makeTask({
      id: 1,
      name: 'Plan launch',
      section: 'now',
      subTasks: [{ id: 1, text: 'Draft brief', done: false }],
    }),
  ])
  await page.reload()

  await taskOpenButton(page, 'Plan launch').click()
  const modal = taskDetailModal(page)
  await modal.getByLabel("Mark sub-task 'Draft brief' as done", { exact: true }).click()

  await page.keyboard.press('Escape')
  await page.reload()

  const tasks = await readTasks(page)
  const subTasks = (tasks[0] as { subTasks: { id: number; done: boolean }[] }).subTasks
  expect(subTasks[0]!.done).toBe(true)
})

test('deleting the currently-open task returns focus to its section heading', async ({ page }) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Obsolete task', section: 'now' })])
  await page.reload()

  await taskOpenButton(page, 'Obsolete task').click()
  const modal = taskDetailModal(page)
  await modal.getByRole('button', { name: 'Delete task', exact: true }).click()
  await taskDetailDeleteDialog(page).getByRole('button', { name: 'Yes', exact: true }).click()

  await expect(modal).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Now', exact: true })).toBeFocused()
})

test('full keyboard-only pass: open via Enter, tab through every field to Delete, Escape closes and returns focus', async ({
  page,
}) => {
  await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
  await page.reload()

  const opener = taskOpenButton(page, 'Draft memo')
  await opener.focus()
  await page.keyboard.press('Enter')

  const modal = taskDetailModal(page)
  await expect(modal).toBeVisible()

  const deleteButton = modal.getByRole('button', { name: 'Delete task', exact: true })
  let reachedDelete = false
  for (let i = 0; i < 60 && !reachedDelete; i++) {
    await page.keyboard.press('Tab')
    reachedDelete = await deleteButton.evaluate((el) => el === document.activeElement)
    const stillInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return !!dialog && dialog.contains(document.activeElement)
    })
    expect(stillInDialog).toBe(true)
  }
  expect(reachedDelete).toBe(true)

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect(opener).toBeFocused()
})

test.describe('mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('gives the done checkbox, Save, and Delete buttons a 44px minimum tap target', async ({
    page,
  }) => {
    await seedTasks(page, [makeTask({ id: 1, name: 'Draft memo', section: 'now' })])
    await page.reload()

    await taskOpenButton(page, 'Draft memo').click()
    const modal = taskDetailModal(page)

    const doneBox = await modal.getByLabel('Mark as done', { exact: true }).boundingBox()
    const saveBox = await modal.getByRole('button', { name: 'Save', exact: true }).boundingBox()
    const deleteBox = await modal
      .getByRole('button', { name: 'Delete task', exact: true })
      .boundingBox()

    for (const box of [doneBox, saveBox, deleteBox]) {
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
  })
})
