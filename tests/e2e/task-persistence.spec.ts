import type { Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import {
  addTaskButton,
  addTaskModal,
  taskItem,
  taskDoneToggle,
  readTasks,
  completedButton,
  completedRowCheckbox,
  taskOpenButton,
  taskDetailModal,
  makeTask,
} from './helpers'

const TASKS_STORAGE_KEY = 'untangle:tasks'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function addTaskViaModal(page: Page, name: string) {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill(name)
  await modal.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(modal).toBeHidden()
}

test('a task added via the modal is still rendered, with the same name and done state, after a reload', async ({
  page,
}) => {
  await addTaskViaModal(page, 'Buy groceries')

  await expect(taskItem(page, 'Buy groceries')).toBeVisible()
  await expect(taskDoneToggle(page, 'Buy groceries')).not.toBeChecked()

  await page.reload()

  await expect(taskItem(page, 'Buy groceries')).toBeVisible()
  await expect(taskDoneToggle(page, 'Buy groceries')).not.toBeChecked()
})

test('toggling a task done, then reloading, preserves the toggled state', async ({ page }) => {
  await addTaskViaModal(page, 'File taxes')

  await taskDoneToggle(page, 'File taxes').click()
  await expect(taskItem(page, 'File taxes')).toHaveCount(0)

  await page.reload()

  await expect(taskItem(page, 'File taxes')).toHaveCount(0)
  const stored = await readTasks(page)
  expect(stored).toHaveLength(1)
  expect(stored[0]!.done).toBe(true)

  await completedButton(page).click()
  await expect(completedRowCheckbox(page, 'File taxes')).toBeChecked()
})

test('malformed localStorage task data falls back to an empty board without crashing', async ({
  page,
}) => {
  await page.evaluate((key) => localStorage.setItem(key, '{not valid json'), TASKS_STORAGE_KEY)

  await page.reload()

  await expect(page.getByRole('region', { name: 'Now', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Next', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Later', exact: true })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

// Hydration of invalid stored data (requirement 19). Each test seeds raw storage, reloads, and
// collects uncaught page errors, which must stay empty.
async function seedRaw(page: Page, value: unknown) {
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, JSON.stringify(raw)), {
    key: TASKS_STORAGE_KEY,
    raw: value,
  })
}

function collectPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  // Vue catches errors thrown inside event handlers/render and logs them via console.error
  // rather than rethrowing, so they never surface as pageerror events.
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

async function expectBoardRegions(page: Page) {
  for (const name of ['Now', 'Next', 'Later']) {
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible()
  }
}

test('a minimal stored record from the request example renders and opens in the detail dialog', async ({
  page,
}) => {
  const errors = collectPageErrors(page)
  await seedRaw(page, [{ id: 1, name: 'Example task', section: 'now' }])
  await page.reload()

  await expectBoardRegions(page)
  const nowRegion = page.getByRole('region', { name: 'Now', exact: true })
  await expect(nowRegion.getByRole('listitem').filter({ hasText: 'Example task' })).toBeVisible()

  await taskOpenButton(page, 'Example task').click()
  const dialog = taskDetailModal(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Task name', { exact: true })).toHaveValue('Example task')
  await expect(dialog.getByLabel('Days', { exact: true })).toHaveValue('0')
  await expect(dialog.getByLabel('Hrs', { exact: true })).toHaveValue('0')
  await expect(dialog.getByLabel('Min', { exact: true })).toHaveValue('0')
  await expect(dialog.getByRole('listitem')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a mixed stored array renders only its surviving tasks without page errors', async ({
  page,
}) => {
  const errors = collectPageErrors(page)
  await seedRaw(page, [
    makeTask({ id: 1, name: 'Valid one' }),
    null,
    42,
    makeTask({ id: 2, name: 'Odd section', section: 'someday' }),
    makeTask({ id: 1, name: 'Duplicate id' }),
  ])
  await page.reload()

  await expectBoardRegions(page)
  await expect(page.getByRole('listitem')).toHaveCount(3)
  await expect(taskItem(page, 'Valid one')).toBeVisible()
  await expect(taskItem(page, 'Odd section')).toBeVisible()
  await expect(taskItem(page, 'Duplicate id')).toBeVisible()
  expect(errors).toEqual([])
})

test('an incomplete stored record can be completed and then appears checked in the Completed panel', async ({
  page,
}) => {
  const errors = collectPageErrors(page)
  await seedRaw(page, [{ id: 1, name: 'Bare task', section: 'now' }])
  await page.reload()

  await expect(taskItem(page, 'Bare task')).toBeVisible()
  await taskDoneToggle(page, 'Bare task').click()
  await expect(taskItem(page, 'Bare task')).toHaveCount(0)

  await completedButton(page).click()
  await expect(completedRowCheckbox(page, 'Bare task')).toBeChecked()

  // The mutation persists the hydrated (normalised) list, so the stored record is now complete.
  const stored = await readTasks(page)
  expect(stored).toHaveLength(1)
  expect(stored[0]).toMatchObject({
    id: 1,
    name: 'Bare task',
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: true,
  })
  expect(Number.isFinite(stored[0]!.createdAt)).toBe(true)
  expect(Number.isFinite(stored[0]!.updatedAt)).toBe(true)
  expect(errors).toEqual([])
})
