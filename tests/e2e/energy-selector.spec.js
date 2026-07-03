import { test, expect } from '@playwright/test'
import { energyButton, toast } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('shows no energy level selected on first load', async ({ page }) => {
  for (const label of ['Low', 'Medium', 'High']) {
    await expect(energyButton(page, label)).toHaveAttribute('aria-pressed', 'false')
  }
  await expect(toast(page)).toHaveCount(0)
})

test('selecting a level highlights it and shows an encouraging toast', async ({ page }) => {
  await energyButton(page, 'Low').click()

  await expect(energyButton(page, 'Low')).toHaveAttribute('aria-pressed', 'true')
  await expect(toast(page)).toBeVisible()
  await expect(toast(page)).not.toBeEmpty()
})

test('clicking the selected level again deselects it and shows no new toast', async ({ page }) => {
  await energyButton(page, 'Medium').click()
  await expect(energyButton(page, 'Medium')).toHaveAttribute('aria-pressed', 'true')
  const firstMessage = await toast(page).textContent()

  await energyButton(page, 'Medium').click()

  await expect(energyButton(page, 'Medium')).toHaveAttribute('aria-pressed', 'false')
  const stillShowing = await toast(page).count()
  if (stillShowing) {
    await expect(toast(page)).toContainText(firstMessage)
  }
})

test('switching directly to a different level replaces the toast', async ({ page }) => {
  await energyButton(page, 'Low').click()
  await expect(toast(page)).toBeVisible()

  await energyButton(page, 'High').click()

  await expect(energyButton(page, 'High')).toHaveAttribute('aria-pressed', 'true')
  await expect(energyButton(page, 'Low')).toHaveAttribute('aria-pressed', 'false')
  await expect(toast(page)).toBeVisible()
})

test('the toast can be dismissed manually', async ({ page }) => {
  await energyButton(page, 'High').click()
  await expect(toast(page)).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss' }).click()

  await expect(toast(page)).toHaveCount(0)
})

test('the toast disappears on its own after a few seconds', async ({ page }) => {
  await energyButton(page, 'Medium').click()
  await expect(toast(page)).toBeVisible()

  await expect(toast(page)).toHaveCount(0, { timeout: 8000 })
})

test('selection resets to none after a reload', async ({ page }) => {
  await energyButton(page, 'High').click()
  await expect(energyButton(page, 'High')).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(energyButton(page, 'High')).toHaveAttribute('aria-pressed', 'false')
  await expect(toast(page)).toHaveCount(0)
})
