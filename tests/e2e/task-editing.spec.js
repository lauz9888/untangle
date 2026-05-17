import { test, expect } from '@playwright/test'
import { addTask, taskCard, openEdit } from './helpers.js'

test.describe('task editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('clicking the edit button opens the edit form', async ({ page }) => {
    await addTask(page, 'now', 'Original title')
    const editCard = await openEdit(page, 'now', 'Original title')
    await expect(editCard.locator('.edit-form')).toBeVisible()
  })

  test('edit form pre-fills with the current title', async ({ page }) => {
    await addTask(page, 'now', 'Original title')
    const editCard = await openEdit(page, 'now', 'Original title')
    await expect(editCard.locator('.edit-title-input')).toHaveValue('Original title')
  })

  test('saves the updated title on Save', async ({ page }) => {
    await addTask(page, 'now', 'Original title')
    const editCard = await openEdit(page, 'now', 'Original title')
    await editCard.locator('.edit-title-input').fill('Updated title')
    await editCard.locator('.btn-primary').click()
    await expect(page.locator('[data-column="now"]')).toContainText('Updated title')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Original title')
  })

  test('saves the updated title on Enter', async ({ page }) => {
    await addTask(page, 'now', 'Original title')
    const editCard = await openEdit(page, 'now', 'Original title')
    await editCard.locator('.edit-title-input').fill('Enter-saved title')
    await editCard.locator('.edit-title-input').press('Enter')
    await expect(page.locator('[data-column="now"]')).toContainText('Enter-saved title')
  })

  test('discards changes on Cancel', async ({ page }) => {
    await addTask(page, 'now', 'Original title')
    const editCard = await openEdit(page, 'now', 'Original title')
    await editCard.locator('.edit-title-input').fill('Abandoned edit')
    await editCard.locator('.btn-secondary').click()
    await expect(page.locator('[data-column="now"]')).toContainText('Original title')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Abandoned edit')
  })

  test('edit form closes after saving', async ({ page }) => {
    await addTask(page, 'now', 'Task')
    const editCard = await openEdit(page, 'now', 'Task')
    await editCard.locator('.btn-primary').click()
    await expect(page.locator('.task-card.is-editing')).not.toBeVisible()
  })

  test('can update the energy level in edit mode', async ({ page }) => {
    await addTask(page, 'now', 'Editable task')
    const editCard = await openEdit(page, 'now', 'Editable task')
    await editCard.locator('.energy-opt').filter({ hasText: /^large$/i }).click()
    await editCard.locator('.btn-primary').click()
    await expect(taskCard(page, 'now', 'Editable task').locator('.energy-badge')).toContainText('large')
  })

  test('can add a subtask in edit mode', async ({ page }) => {
    await addTask(page, 'now', 'Task with subtasks')
    const editCard = await openEdit(page, 'now', 'Task with subtasks')
    await editCard.locator('.subtask-input').fill('New subtask')
    await editCard.locator('.btn-subtle').click()
    await expect(editCard.locator('.subtask-title')).toContainText('New subtask')
  })
})
