import { test, expect } from '@playwright/test'
import { energyButton, encourageButton, toast } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('shows an encouraging toast when clicked with no energy level selected', async ({ page }) => {
  await expect(toast(page)).toHaveCount(0)

  await encourageButton(page).click()

  await expect(toast(page)).toBeVisible()
  await expect(toast(page)).not.toBeEmpty()
  for (const label of ['Low', 'Medium', 'High']) {
    await expect(energyButton(page, label)).toHaveAttribute('aria-pressed', 'false')
  }
})

test('does not change the currently selected energy level', async ({ page }) => {
  await energyButton(page, 'Medium').click()
  await expect(energyButton(page, 'Medium')).toHaveAttribute('aria-pressed', 'true')

  await encourageButton(page).click()

  await expect(energyButton(page, 'Medium')).toHaveAttribute('aria-pressed', 'true')
  await expect(toast(page)).toBeVisible()
})

test('replaces a currently-showing energy-level toast', async ({ page }) => {
  await energyButton(page, 'High').click()
  await expect(toast(page)).toBeVisible()

  await encourageButton(page).click()

  await expect(toast(page)).toBeVisible()
  await expect(toast(page)).not.toBeEmpty()
})

test('selecting an energy level afterwards replaces the encouragement toast', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  await energyButton(page, 'Low').click()

  await expect(energyButton(page, 'Low')).toHaveAttribute('aria-pressed', 'true')
  await expect(toast(page)).toBeVisible()
})

test('the toast can be dismissed manually', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss' }).click()

  await expect(toast(page)).toHaveCount(0)
})

test('the toast disappears on its own after a few seconds', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  await expect(toast(page)).toHaveCount(0, { timeout: 8000 })
})

test('clicking again while a toast is showing keeps the toast visible', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  await encourageButton(page).click()

  await expect(toast(page)).toBeVisible()
  await expect(toast(page)).not.toBeEmpty()
})
