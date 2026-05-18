import { test, expect } from '@playwright/test'
import { addTask, taskCard, openEdit } from './helpers.js'

test.describe('edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test.describe('corrupted localStorage', () => {
    test('app loads cleanly after garbled JSON in tasks', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('untangle-tasks', 'not-valid-json{{'))
      await page.reload()
      await expect(page.locator('[data-column="now"]')).toBeVisible()
      await expect(page.locator('[data-column="now"] .task-card')).toHaveCount(0)
    })

    test('can add tasks after recovering from corrupted storage', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('untangle-tasks', 'not-valid-json{{'))
      await page.reload()
      await addTask(page, 'now', 'Fresh start task')
      await expect(page.locator('[data-column="now"]')).toContainText('Fresh start task')
    })

    test('app loads cleanly after valid-JSON but non-array tasks', async ({ page }) => {
      await page.evaluate(() => localStorage.setItem('untangle-tasks', JSON.stringify({ stray: true })))
      await page.reload()
      await expect(page.locator('[data-column="now"]')).toBeVisible()
      await expect(page.locator('[data-column="now"] .task-card')).toHaveCount(0)
    })
  })

  test.describe('reload during editing', () => {
    test('edit form does not persist after page reload', async ({ page }) => {
      await addTask(page, 'now', 'Edit form task')
      await openEdit(page, 'now', 'Edit form task')
      await page.reload()
      await expect(page.locator('.task-card.is-editing')).not.toBeVisible()
    })

    test('original title is preserved when edit is abandoned via reload', async ({ page }) => {
      await addTask(page, 'now', 'Reload abandon test')
      const editCard = await openEdit(page, 'now', 'Reload abandon test')
      await editCard.locator('[data-testid="edit-title-input"]').fill('Never saved title')
      await page.reload()
      await expect(page.locator('[data-column="now"]')).toContainText('Reload abandon test')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Never saved title')
    })
  })

  test.describe('duplicate task titles', () => {
    test('can add two tasks with identical names', async ({ page }) => {
      await addTask(page, 'now', 'Same name')
      await addTask(page, 'now', 'Same name')
      await expect(page.locator('[data-column="now"] .task-card').filter({ hasText: 'Same name' })).toHaveCount(2)
    })

    test('completing one of two identical tasks leaves the other', async ({ page }) => {
      await addTask(page, 'now', 'Twin task')
      await addTask(page, 'now', 'Twin task')
      const cards = page.locator('[data-column="now"] .task-card').filter({ hasText: 'Twin task' })
      const firstCard = cards.first()
      await firstCard.hover()
      await firstCard.locator('[data-testid="complete-btn"]').click()
      await expect(page.locator('[data-column="now"] .task-card').filter({ hasText: 'Twin task' })).toHaveCount(1)
    })

    test('deleting one of two identical tasks leaves the other', async ({ page }) => {
      await addTask(page, 'now', 'Clone task')
      await addTask(page, 'now', 'Clone task')
      const cards = page.locator('[data-column="now"] .task-card').filter({ hasText: 'Clone task' })
      const firstCard = cards.first()
      await firstCard.hover()
      await firstCard.locator('[data-testid="delete-btn"]').click()
      await expect(page.locator('[data-column="now"] .task-card').filter({ hasText: 'Clone task' })).toHaveCount(1)
    })
  })

  test.describe('edit combined fields', () => {
    test('can change title, energy, and due date in a single edit', async ({ page }) => {
      await addTask(page, 'now', 'Multi-field task')
      const editCard = await openEdit(page, 'now', 'Multi-field task')
      await editCard.locator('[data-testid="edit-title-input"]').fill('Multi-field updated')
      await editCard.locator('.energy-opt').filter({ hasText: /^medium$/i }).click()
      await editCard.locator('[data-testid="due-date-input"]').fill('2099-12-31')
      await editCard.locator('.btn-primary').click()
      const card = taskCard(page, 'now', 'Multi-field updated')
      await expect(card).toBeVisible()
      await expect(card.locator('.energy-badge')).toContainText('medium')
      await expect(card.locator('.date-chip')).toContainText('Due')
    })
  })
})
