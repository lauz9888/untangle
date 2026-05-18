import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

/** Calculate a local date string in the browser (offsetDays from today). */
async function localDate(page, offsetDays = 0) {
  return page.evaluate((offset) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, offsetDays)
}

async function openSettings(page) {
  await page.getByRole('button', { name: /open settings/i }).click()
}

test.describe('streak', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test.describe('streak display', () => {
    test('shows a streak display in the header', async ({ page }) => {
      await expect(page.locator('.streak-display')).toBeVisible()
    })

    test('shows "0 days" when no tasks have been completed', async ({ page }) => {
      await expect(page.locator('.streak-text')).toHaveText('0 days')
    })

    test('does not have active styling when streak is 0', async ({ page }) => {
      await expect(page.locator('.streak-display')).not.toHaveClass(/streak-active/)
    })

    test('shows "1 day" after completing a task today', async ({ page }) => {
      await addTask(page, 'now', 'First task')
      const card = taskCard(page, 'now', 'First task')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('.streak-text')).toHaveText('1 day')
    })

    test('has active styling after completing a task', async ({ page }) => {
      await addTask(page, 'now', 'Active task')
      const card = taskCard(page, 'now', 'Active task')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('.streak-display')).toHaveClass(/streak-active/)
    })

    test('completing a second task on the same day does not increment the streak', async ({ page }) => {
      await addTask(page, 'now', 'Task one')
      await addTask(page, 'now', 'Task two')

      const card1 = taskCard(page, 'now', 'Task one')
      await card1.hover()
      await card1.locator('.complete-btn').click()
      await expect(page.locator('.streak-text')).toHaveText('1 day')

      const card2 = taskCard(page, 'now', 'Task two')
      await card2.hover()
      await card2.locator('.complete-btn').click()
      await expect(page.locator('.streak-text')).toHaveText('1 day')
    })

    test('shows stored streak count when the streak was active yesterday', async ({ page }) => {
      const yesterday = await localDate(page, -1)
      await page.evaluate((date) => {
        localStorage.setItem('untangle-streak', JSON.stringify({ count: 4, lastCompletedDate: date }))
      }, yesterday)
      await page.reload()
      await expect(page.locator('.streak-text')).toHaveText('4 days')
      await expect(page.locator('.streak-display')).toHaveClass(/streak-active/)
    })

    test('shows 0 when a day was missed', async ({ page }) => {
      const twoDaysAgo = await localDate(page, -2)
      await page.evaluate((date) => {
        localStorage.setItem('untangle-streak', JSON.stringify({ count: 7, lastCompletedDate: date }))
      }, twoDaysAgo)
      await page.reload()
      await expect(page.locator('.streak-text')).toHaveText('0 days')
      await expect(page.locator('.streak-display')).not.toHaveClass(/streak-active/)
    })

    test('increments onto an existing streak when completing today', async ({ page }) => {
      const yesterday = await localDate(page, -1)
      await page.evaluate((date) => {
        localStorage.setItem('untangle-streak', JSON.stringify({ count: 3, lastCompletedDate: date }))
      }, yesterday)
      await page.reload()

      await addTask(page, 'now', 'Keep it going')
      const card = taskCard(page, 'now', 'Keep it going')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('.streak-text')).toHaveText('4 days')
    })
  })

  test.describe('streak persistence', () => {
    test('streak count survives a page reload', async ({ page }) => {
      await addTask(page, 'now', 'Persist me')
      const card = taskCard(page, 'now', 'Persist me')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('.streak-text')).toHaveText('1 day')
      await page.reload()
      await expect(page.locator('.streak-text')).toHaveText('1 day')
    })
  })

  test.describe('streak settings — display', () => {
    test('settings panel shows a Streak section', async ({ page }) => {
      await openSettings(page)
      await expect(page.locator('.section-title')).toHaveText('Streak')
    })

    test('shows the Exclude weekends toggle', async ({ page }) => {
      await openSettings(page)
      await expect(page.locator('.toggle-name').filter({ hasText: 'Exclude weekends' })).toBeVisible()
    })

    test('shows the Exclude UK bank holidays toggle', async ({ page }) => {
      await openSettings(page)
      await expect(page.locator('.toggle-name').filter({ hasText: 'Exclude UK bank holidays' })).toBeVisible()
    })

    test('shows the Streak freeze toggle', async ({ page }) => {
      await openSettings(page)
      await expect(page.locator('.toggle-name').filter({ hasText: 'Streak freeze' })).toBeVisible()
    })

    test('the Streak section appears below the About nav item', async ({ page }) => {
      await openSettings(page)
      const aboutBtn = page.locator('.settings-nav-item')
      const streakSection = page.locator('.settings-section')
      const aboutBox = await aboutBtn.boundingBox()
      const sectionBox = await streakSection.boundingBox()
      expect(sectionBox.y).toBeGreaterThan(aboutBox.y)
    })
  })

  test.describe('streak settings — streak freeze', () => {
    test('the freeze date picker is hidden when streak freeze is off', async ({ page }) => {
      await openSettings(page)
      await expect(page.locator('.freeze-date-row')).not.toBeVisible()
    })

    test('enabling streak freeze reveals the date picker', async ({ page }) => {
      await openSettings(page)
      await page.locator('input[aria-label="Enable streak freeze"]').check()
      await expect(page.locator('.freeze-date-row')).toBeVisible()
    })

    test('the freeze date picker defaults to today when first enabled', async ({ page }) => {
      const today = await localDate(page)
      await openSettings(page)
      await page.locator('input[aria-label="Enable streak freeze"]').check()
      await expect(page.locator('.freeze-date-input')).toHaveValue(today)
    })

    test('disabling streak freeze hides the date picker again', async ({ page }) => {
      await openSettings(page)
      const freezeToggle = page.locator('input[aria-label="Enable streak freeze"]')
      await freezeToggle.check()
      await expect(page.locator('.freeze-date-row')).toBeVisible()
      await freezeToggle.uncheck()
      await expect(page.locator('.freeze-date-row')).not.toBeVisible()
    })
  })

  test.describe('streak settings — persistence', () => {
    test('Exclude weekends setting survives a page reload', async ({ page }) => {
      await openSettings(page)
      await page.locator('input[aria-label="Exclude weekends from streak"]').check()
      await page.locator('.settings-close').click()
      await page.reload()
      await openSettings(page)
      await expect(page.locator('input[aria-label="Exclude weekends from streak"]')).toBeChecked()
    })

    test('Exclude UK bank holidays setting survives a page reload', async ({ page }) => {
      await openSettings(page)
      await page.locator('input[aria-label="Exclude UK bank holidays from streak"]').check()
      await page.locator('.settings-close').click()
      await page.reload()
      await openSettings(page)
      await expect(page.locator('input[aria-label="Exclude UK bank holidays from streak"]')).toBeChecked()
    })

    test('Streak freeze date survives a page reload', async ({ page }) => {
      await openSettings(page)
      await page.locator('input[aria-label="Enable streak freeze"]').check()
      const freezeInput = page.locator('.freeze-date-input')
      await freezeInput.fill('2025-12-31')
      await page.locator('.settings-close').click()
      await page.reload()
      await openSettings(page)
      await expect(page.locator('input[aria-label="Enable streak freeze"]')).toBeChecked()
      await expect(page.locator('.freeze-date-input')).toHaveValue('2025-12-31')
    })
  })
})
