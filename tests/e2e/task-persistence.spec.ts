import type { Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import { addTaskButton, addTaskModal, taskItem, taskDoneToggle } from './helpers'

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
  await expect(taskDoneToggle(page, 'File taxes')).toBeChecked()

  await page.reload()

  await expect(taskDoneToggle(page, 'File taxes')).toBeChecked()
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
