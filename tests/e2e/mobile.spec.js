import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

// Helper: dispatch a synthetic touch drag using JavaScript touch events.
// touchstart fires on the card element; touchmove and touchend fire on document
// (matching where the handlers are registered in TaskCard.vue).
async function touchDrag(page, startX, startY, endX, endY) {
  await page.evaluate(({ startX, startY, endX, endY }) => {
    function makeTouch(x, y, target) {
      return new Touch({
        identifier: 1,
        target,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
      })
    }

    const cardEl = document.querySelector('[data-column="now"] .task-card')
    cardEl.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [makeTouch(startX, startY, cardEl)],
      targetTouches: [makeTouch(startX, startY, cardEl)],
      changedTouches: [makeTouch(startX, startY, cardEl)],
    }))

    // Move well past the 8 px threshold so the drag activates.
    const midX = startX + 30
    const midY = startY + 30
    document.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [makeTouch(midX, midY, cardEl)],
      targetTouches: [makeTouch(midX, midY, cardEl)],
      changedTouches: [makeTouch(midX, midY, cardEl)],
    }))

    // Final move to the drop target position.
    document.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [makeTouch(endX, endY, cardEl)],
      targetTouches: [makeTouch(endX, endY, cardEl)],
      changedTouches: [makeTouch(endX, endY, cardEl)],
    }))

    // Lift finger at the drop target position.
    document.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      changedTouches: [makeTouch(endX, endY, cardEl)],
    }))
  }, { startX, startY, endX, endY })
}

test.describe('mobile — touch drag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('touch-drags a task from Now to Next', async ({ page }) => {
    await addTask(page, 'now', 'Touch dragged task')

    const cardBox = await taskCard(page, 'now', 'Touch dragged task').boundingBox()
    const targetBox = await page.locator('[data-column="next"]').boundingBox()

    await touchDrag(
      page,
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    )

    await expect(page.locator('[data-column="next"]')).toContainText('Touch dragged task')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Touch dragged task')
  })

  test('touch-drags a task from Now to Future', async ({ page }) => {
    await addTask(page, 'now', 'Long touch journey')

    const cardBox = await taskCard(page, 'now', 'Long touch journey').boundingBox()
    const targetBox = await page.locator('[data-column="future"]').boundingBox()

    await touchDrag(
      page,
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    )

    await expect(page.locator('[data-column="future"]')).toContainText('Long touch journey')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Long touch journey')
  })

  test('touch drag persists after reload', async ({ page }) => {
    await addTask(page, 'now', 'Persists after touch drag')

    const cardBox = await taskCard(page, 'now', 'Persists after touch drag').boundingBox()
    const targetBox = await page.locator('[data-column="next"]').boundingBox()

    await touchDrag(
      page,
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
    )

    await page.reload()
    await expect(page.locator('[data-column="next"]')).toContainText('Persists after touch drag')
    await expect(page.locator('[data-column="now"]')).not.toContainText('Persists after touch drag')
  })
})

test.describe('mobile — layout at narrow viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('columns stack vertically at 390px wide', async ({ page }) => {
    const now = await page.locator('[data-column="now"]').boundingBox()
    const next = await page.locator('[data-column="next"]').boundingBox()
    const future = await page.locator('[data-column="future"]').boundingBox()

    // Every column starts near x=0 (allowing for padding)
    expect(now.x).toBeLessThan(50)
    expect(next.x).toBeLessThan(50)
    expect(future.x).toBeLessThan(50)

    // Columns are laid out vertically
    expect(next.y).toBeGreaterThan(now.y)
    expect(future.y).toBeGreaterThan(next.y)
  })

  test('app title is visible at narrow viewport', async ({ page }) => {
    await expect(page.locator('.app-title')).toBeVisible()
  })

  test('energy selector label is visible at narrow viewport', async ({ page }) => {
    await expect(page.locator('.energy-label')).toBeVisible()
  })

  test('action buttons are present in the DOM and functional on narrow viewport', async ({ page }) => {
    await addTask(page, 'now', 'Mobile task')
    const card = taskCard(page, 'now', 'Mobile task')

    // Buttons are always rendered (never conditionally removed from the DOM).
    await expect(card.locator('.complete-btn')).toBeAttached()
    await expect(card.locator('.edit-btn')).toBeAttached()
    await expect(card.locator('.delete-btn')).toBeAttached()

    // Delete button works via direct click (important on mobile where hover is unavailable).
    await card.locator('.delete-btn').click({ force: true })
    await expect(page.locator('[data-column="now"]')).not.toContainText('Mobile task')
  })
})
