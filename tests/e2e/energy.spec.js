import { test, expect } from '@playwright/test'
import { addTask } from './helpers.js'

test.describe('energy filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('clicking an energy button marks it as active', async ({ page }) => {
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /large/i }).click()
    await expect(
      page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /large/i })
    ).toHaveClass(/active/)
  })

  test('a large task has the over-capacity class when energy is tiny', async ({ page }) => {
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /tiny/i }).click()
    await addTask(page, 'now', 'Big task', { energy: 'large' })
    await expect(page.locator('.task-card').filter({ hasText: 'Big task' })).toHaveClass(/over-capacity/)
  })

  test('a tiny task does not have over-capacity class when energy is tiny', async ({ page }) => {
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /tiny/i }).click()
    await addTask(page, 'now', 'Tiny task', { energy: 'tiny' })
    await expect(page.locator('.task-card').filter({ hasText: 'Tiny task' })).not.toHaveClass(/over-capacity/)
  })

  test('over-capacity class is removed when energy is raised', async ({ page }) => {
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /tiny/i }).click()
    await addTask(page, 'now', 'Medium task', { energy: 'medium' })
    await expect(page.locator('.task-card').filter({ hasText: 'Medium task' })).toHaveClass(/over-capacity/)
    await page.locator('[aria-label="Current energy level"]').getByRole('button', { name: /large/i }).click()
    await expect(page.locator('.task-card').filter({ hasText: 'Medium task' })).not.toHaveClass(/over-capacity/)
  })
})
