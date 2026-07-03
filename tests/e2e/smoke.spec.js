import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('shows the Untangle logo and tagline, with no other content', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Untangle' })).toBeVisible()
  await expect(page.getByText('Space to think')).toBeVisible()
  await expect(page.locator('nav')).toHaveCount(0)
  await expect(page.locator('p')).toHaveCount(1)
})
