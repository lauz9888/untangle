import { test, expect } from '@playwright/test'

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('shows the app title', async ({ page }) => {
    await expect(page.locator('.app-title')).toContainText('untangle')
  })

  test('shows three column headers: Now, Next, Future', async ({ page }) => {
    await expect(page.locator('[data-column="now"] .column-header')).toContainText('Now')
    await expect(page.locator('[data-column="next"] .column-header')).toContainText('Next')
    await expect(page.locator('[data-column="future"] .column-header')).toContainText('Future')
  })

  test('shows four energy level buttons in the header', async ({ page }) => {
    const group = page.locator('[aria-label="Current energy level"]')
    await expect(group.getByRole('button', { name: /tiny/i })).toBeVisible()
    await expect(group.getByRole('button', { name: /small/i })).toBeVisible()
    await expect(group.getByRole('button', { name: /medium/i })).toBeVisible()
    await expect(group.getByRole('button', { name: /large/i })).toBeVisible()
  })

  test('no energy button is active by default', async ({ page }) => {
    const group = page.locator('[aria-label="Current energy level"]')
    const buttons = group.getByRole('button')
    await expect(buttons.nth(0)).not.toHaveClass(/active/)
    await expect(buttons.nth(1)).not.toHaveClass(/active/)
    await expect(buttons.nth(2)).not.toHaveClass(/active/)
    await expect(buttons.nth(3)).not.toHaveClass(/active/)
  })

  test('shows an Add task button in each column', async ({ page }) => {
    await expect(page.locator('[data-column="now"] .add-task-btn')).toBeVisible()
    await expect(page.locator('[data-column="next"] .add-task-btn')).toBeVisible()
    await expect(page.locator('[data-column="future"] .add-task-btn')).toBeVisible()
  })
})
