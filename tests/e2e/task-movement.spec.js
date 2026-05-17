import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

test.describe('task movement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test.describe('arrow buttons', () => {
    test('moves a task from Now to Next', async ({ page }) => {
      await addTask(page, 'now', 'Travelling task')
      const card = taskCard(page, 'now', 'Travelling task')
      await card.hover()
      await card.locator('.move-next-btn').click()
      await expect(page.locator('[data-column="next"]')).toContainText('Travelling task')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Travelling task')
    })

    test('moves a task from Next to Future', async ({ page }) => {
      await addTask(page, 'next', 'Far away task')
      const card = taskCard(page, 'next', 'Far away task')
      await card.hover()
      await card.locator('.move-next-btn').click()
      await expect(page.locator('[data-column="future"]')).toContainText('Far away task')
    })

    test('moves a task backward from Future to Next', async ({ page }) => {
      await addTask(page, 'future', 'Coming back')
      const card = taskCard(page, 'future', 'Coming back')
      await card.hover()
      await card.locator('.move-prev-btn').click()
      await expect(page.locator('[data-column="next"]')).toContainText('Coming back')
    })

    test('left button is disabled in the Now column', async ({ page }) => {
      await addTask(page, 'now', 'Stuck here')
      const card = taskCard(page, 'now', 'Stuck here')
      await card.hover()
      await expect(card.locator('.move-prev-btn')).toBeDisabled()
    })

    test('right button is disabled in the Future column', async ({ page }) => {
      await addTask(page, 'future', 'Already future')
      const card = taskCard(page, 'future', 'Already future')
      await card.hover()
      await expect(card.locator('.move-next-btn')).toBeDisabled()
    })
  })

  test.describe('drag and drop', () => {
    test('drags a task from Now to Next', async ({ page }) => {
      await addTask(page, 'now', 'Dragged task')
      await page.locator('[data-column="now"] .task-card').dragTo(page.locator('[data-column="next"]'))
      await expect(page.locator('[data-column="next"]')).toContainText('Dragged task')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Dragged task')
    })

    test('drags a task from Now all the way to Future', async ({ page }) => {
      await addTask(page, 'now', 'Long journey')
      await page.locator('[data-column="now"] .task-card').dragTo(page.locator('[data-column="future"]'))
      await expect(page.locator('[data-column="future"]')).toContainText('Long journey')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Long journey')
    })

    test('drags a task backward from Future to Now', async ({ page }) => {
      await addTask(page, 'future', 'Coming forward')
      await page.locator('[data-column="future"] .task-card').dragTo(page.locator('[data-column="now"]'))
      await expect(page.locator('[data-column="now"]')).toContainText('Coming forward')
      await expect(page.locator('[data-column="future"]')).not.toContainText('Coming forward')
    })

    test('dragging to the same column leaves the task in place', async ({ page }) => {
      await addTask(page, 'now', 'Stay here')
      await page.locator('[data-column="now"] .task-card').dragTo(page.locator('[data-column="now"]'))
      await expect(page.locator('[data-column="now"]')).toContainText('Stay here')
    })

    test('dragged task persists in new column after reload', async ({ page }) => {
      await addTask(page, 'now', 'Persists after drag')
      await page.locator('[data-column="now"] .task-card').dragTo(page.locator('[data-column="next"]'))
      await page.reload()
      await expect(page.locator('[data-column="next"]')).toContainText('Persists after drag')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Persists after drag')
    })
  })
})
