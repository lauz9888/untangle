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

  test('settings cog is to the right of all other header buttons on desktop', async ({ page }) => {
    const settingsBox = await page.getByRole('button', { name: /open settings/i }).boundingBox()
    const encourageBox = await page.getByRole('button', { name: /encourage me/i }).boundingBox()
    const toughLoveBox = await page.getByRole('button', { name: /tough love/i }).boundingBox()
    const historyBox = await page.getByRole('button', { name: /history/i }).boundingBox()

    expect(settingsBox.x).toBeGreaterThan(encourageBox.x)
    expect(settingsBox.x).toBeGreaterThan(toughLoveBox.x)
    expect(settingsBox.x).toBeGreaterThan(historyBox.x)
  })
})
