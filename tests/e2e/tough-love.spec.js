import { test, expect } from '@playwright/test'

test.describe('Tough Love', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('Tough Love button is visible in the header', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Tough Love' })).toBeVisible()
  })

  test('clicking Tough Love shows a toast notification', async ({ page }) => {
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
  })

  test('toast displays a non-empty message', async ({ page }) => {
    await page.getByRole('button', { name: 'Tough Love' }).click()
    const text = await page.locator('.tough-love-text').textContent()
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
    await page.waitForTimeout(5100)
    await expect(page.locator('.tough-love-toast')).not.toBeVisible()
  })

  test('clicking the toast dismisses it early', async ({ page }) => {
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
    await page.locator('.tough-love-toast').click()
    await expect(page.locator('.tough-love-toast')).not.toBeVisible()
  })

  test('toast remains visible when button is clicked again', async ({ page }) => {
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
  })

  test('clicking Tough Love while Encourage Me is showing replaces it', async ({ page }) => {
    await page.getByRole('button', { name: 'Encourage Me' }).click()
    await expect(page.locator('.encouragement-toast')).toBeVisible()
    await page.getByRole('button', { name: 'Tough Love' }).click()
    await expect(page.locator('.tough-love-toast')).toBeVisible()
    await expect(page.locator('.encouragement-toast')).not.toBeVisible()
  })
})
