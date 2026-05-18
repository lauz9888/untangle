import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

test.describe('history panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('History button is visible in the header', async ({ page }) => {
    await expect(page.locator('.history-btn')).toBeVisible()
  })

  test('clicking History opens the panel', async ({ page }) => {
    await page.locator('.history-btn').click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test('the panel has the correct aria-label', async ({ page }) => {
    await page.locator('.history-btn').click()
    await expect(page.locator('[role="dialog"]')).toHaveAttribute('aria-label', 'Task history')
  })

  test('closing with the ✕ button hides the panel', async ({ page }) => {
    await page.locator('.history-btn').click()
    await page.locator('.panel-close').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('clicking the backdrop closes the panel', async ({ page }) => {
    await page.locator('.history-btn').click()
    await page.locator('.history-overlay').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('shows empty state message when no tasks are completed', async ({ page }) => {
    await page.locator('.history-btn').click()
    await expect(page.locator('.history-panel')).toContainText('No tasks completed yet')
  })

  test('completed tasks appear in the weekly chart', async ({ page }) => {
    await addTask(page, 'now', 'Task one')
    const card = taskCard(page, 'now', 'Task one')
    await card.hover()
    await card.locator('.complete-btn').click()

    await page.locator('.history-btn').click()
    await expect(page.locator('.bar-chart')).toBeVisible()
  })

  test('the chart shows a bar count after completing a task', async ({ page }) => {
    await addTask(page, 'now', 'Completed task')
    const card = taskCard(page, 'now', 'Completed task')
    await card.hover()
    await card.locator('.complete-btn').click()

    await page.locator('.history-btn').click()
    // Use Playwright's built-in retry rather than a one-shot allTextContents()
    // so the assertion waits for the chart to finish rendering.
    await expect(page.locator('.bar-count').filter({ hasText: '1' })).toBeVisible()
  })

  test('shows best-week banner after a task is completed', async ({ page }) => {
    await addTask(page, 'now', 'Best week task')
    const card = taskCard(page, 'now', 'Best week task')
    await card.hover()
    await card.locator('.complete-btn').click()

    await page.locator('.history-btn').click()
    await expect(page.locator('.best-week')).toBeVisible()
    await expect(page.locator('.best-week-text')).toContainText('most productive week')
  })

  test('best-week banner is hidden when no tasks are completed', async ({ page }) => {
    await page.locator('.history-btn').click()
    await expect(page.locator('.best-week')).not.toBeVisible()
  })
})
