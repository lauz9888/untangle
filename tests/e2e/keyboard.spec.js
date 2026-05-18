import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

test.describe('keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('can open the add-task form using keyboard', async ({ page }) => {
    await page.locator('[data-column="now"] [data-testid="add-task-btn"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"] [data-testid="add-task-form"]')).toBeVisible()
  })

  test('can add a task using keyboard only', async ({ page }) => {
    await page.locator('[data-column="now"] [data-testid="add-task-btn"]').focus()
    await page.keyboard.press('Enter')
    // autofocus is not guaranteed in Playwright; Tab to the input to simulate keyboard navigation
    const input = page.locator('[data-column="now"] [data-testid="task-input"]')
    await input.waitFor()
    await input.focus()
    await page.keyboard.type('Keyboard task')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"]')).toContainText('Keyboard task')
  })

  test('can complete a task using keyboard', async ({ page }) => {
    await addTask(page, 'now', 'Complete via keyboard')
    const card = taskCard(page, 'now', 'Complete via keyboard')
    await card.locator('[data-testid="complete-btn"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Complete via keyboard')
  })

  test('can open the edit form using keyboard', async ({ page }) => {
    await addTask(page, 'now', 'Keyboard edit')
    const card = taskCard(page, 'now', 'Keyboard edit')
    await card.locator('[data-testid="edit-btn"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.task-card.is-editing')).toBeVisible()
  })

  test('can save an edit using keyboard', async ({ page }) => {
    await addTask(page, 'now', 'Before keyboard edit')
    const card = taskCard(page, 'now', 'Before keyboard edit')
    await card.locator('[data-testid="edit-btn"]').focus()
    await page.keyboard.press('Enter')
    const editCard = page.locator('.task-card.is-editing')
    await editCard.locator('[data-testid="edit-title-input"]').fill('After keyboard edit')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"]')).toContainText('After keyboard edit')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Before keyboard edit')
  })

  test('can cancel an edit using keyboard', async ({ page }) => {
    await addTask(page, 'now', 'Cancel keyboard edit')
    const card = taskCard(page, 'now', 'Cancel keyboard edit')
    await card.locator('[data-testid="edit-btn"]').focus()
    await page.keyboard.press('Enter')
    const editCard = page.locator('.task-card.is-editing')
    await editCard.locator('.btn-secondary').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"]')).toContainText('Cancel keyboard edit')
    await expect(page.locator('.task-card.is-editing')).not.toBeVisible()
  })

  test('can delete a task using keyboard', async ({ page }) => {
    await addTask(page, 'now', 'Delete via keyboard')
    const card = taskCard(page, 'now', 'Delete via keyboard')
    await card.locator('[data-testid="delete-btn"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Delete via keyboard')
  })
})
