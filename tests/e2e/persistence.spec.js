import { test, expect } from '@playwright/test'
import { addTask, taskCard, openEdit } from './helpers.js'

test.describe('persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('tasks survive a page reload', async ({ page }) => {
    await addTask(page, 'now', 'Persistent task')
    await page.reload()
    await expect(page.locator('[data-column="now"]')).toContainText('Persistent task')
  })

  test('energy level survives a page reload', async ({ page }) => {
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /large/i }).click()
    await page.reload()
    await expect(
      page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /large/i })
    ).toHaveClass(/active/)
  })

  test('deleted tasks do not reappear after reload', async ({ page }) => {
    await addTask(page, 'now', 'Gone task')
    const card = taskCard(page, 'now', 'Gone task')
    await card.hover()
    await card.locator('.delete-btn').click()
    await page.reload()
    await expect(page.locator('[data-column="now"]')).not.toContainText('Gone task')
  })

  test('moved tasks stay in the correct column after reload', async ({ page }) => {
    await addTask(page, 'now', 'Moved task')
    const card = taskCard(page, 'now', 'Moved task')
    await card.hover()
    await card.locator('.move-next-btn').click()
    await page.reload()
    await expect(page.locator('[data-column="next"]')).toContainText('Moved task')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Moved task')
  })

  test('edited title survives a page reload', async ({ page }) => {
    await addTask(page, 'now', 'Before edit')
    const editCard = await openEdit(page, 'now', 'Before edit')
    await editCard.locator('.edit-title-input').fill('After edit')
    await editCard.locator('.btn-primary').click()
    await page.reload()
    await expect(page.locator('[data-column="now"]')).toContainText('After edit')
  })
})
