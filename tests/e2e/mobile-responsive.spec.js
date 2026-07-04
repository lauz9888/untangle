import { test, expect } from '@playwright/test'
import { energyButton, encourageButton, toast } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('stacks the header vertically instead of side-by-side', async ({ page }) => {
    const brandBox = await page.locator('.brand-text').boundingBox()
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(actionsBox.y).toBeGreaterThan(brandBox.y + brandBox.height)
  })

  test('keeps the header actions within the viewport width', async ({ page }) => {
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(actionsBox.x + actionsBox.width).toBeLessThanOrEqual(375)
  })

  test('gives energy-level buttons and the Encourage me button a 44px minimum tap target', async ({
    page,
  }) => {
    for (const label of ['Low', 'Medium', 'High']) {
      const box = await energyButton(page, label).boundingBox()
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    const encourageBox = await encourageButton(page).boundingBox()
    expect(encourageBox.height).toBeGreaterThanOrEqual(44)
  })

  test('keeps the toast within the viewport and gives its close button a 44px tap target', async ({
    page,
  }) => {
    await energyButton(page, 'Low').click()
    await expect(toast(page)).toBeVisible()

    const toastBox = await toast(page).boundingBox()
    expect(toastBox.x).toBeGreaterThan(8)
    expect(375 - (toastBox.x + toastBox.width)).toBeGreaterThan(8)

    const closeBox = await page.getByRole('button', { name: 'Dismiss' }).boundingBox()
    expect(closeBox.height).toBeGreaterThanOrEqual(44)
    expect(closeBox.width).toBeGreaterThanOrEqual(44)
  })
})

test.describe('desktop viewport (unchanged above 640px)', () => {
  test('keeps the header actions on the same row as the logo', async ({ page }) => {
    const brandBox = await page.locator('.brand-text').boundingBox()
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(Math.abs(actionsBox.y - brandBox.y)).toBeLessThan(20)
  })
})
