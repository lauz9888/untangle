import { test, expect } from '@playwright/test'

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('shows a settings button in the header', async ({ page }) => {
    await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible()
  })

  test('clicking the settings button opens the settings panel', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await expect(page.locator('.settings-panel')).toBeVisible()
  })

  test('the settings panel has an About item', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await expect(page.locator('.settings-nav-item')).toContainText('About')
  })

  test('clicking About opens the About modal', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-nav-item').click()
    await expect(page.locator('.about-modal')).toBeVisible()
  })

  test('the About modal shows descriptive content', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-nav-item').click()
    await expect(page.locator('.about-lead')).toBeVisible()
  })

  test('the About modal close button dismisses the modal', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-nav-item').click()
    await page.locator('.about-modal-close').click()
    await expect(page.locator('.about-modal')).not.toBeVisible()
  })

  test('clicking the About overlay dismisses the modal', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-nav-item').click()
    await page.locator('.about-overlay').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('.about-modal')).not.toBeVisible()
  })

  test('the close button closes the settings panel', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-close').click()
    await expect(page.locator('.settings-panel')).not.toBeVisible()
  })

  test('clicking the settings overlay closes the panel', async ({ page }) => {
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-overlay').click({ position: { x: 10, y: 300 } })
    await expect(page.locator('.settings-panel')).not.toBeVisible()
  })
})
