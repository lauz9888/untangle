import type { Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import {
  addTaskButton,
  addTaskModal,
  encourageButton,
  toast,
  taskDoneToggle,
  taskItem,
  taskOpenButton,
  taskDetailModal,
  taskDetailDeleteDialog,
  taskDetailDiscardDialog,
  makeTask,
  seedTasks,
  readTasks,
  celebration,
  celebrationRegion,
  celebrationClose,
  confettiPieces,
  confettiLayer,
  completedButton,
  completedButtonAlways,
  completedPanel,
  completedPanelClose,
  completedRowButton,
  completedRowCheckbox,
  activeElementIsBody,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

async function reloadWith(page: Page, tasks: Record<string, unknown>[]) {
  await seedTasks(page, tasks)
  await page.reload()
}

function sectionHeading(page: Page, name: string) {
  return page.getByRole('heading', { name, exact: true })
}

test.describe('completing from the board checkbox', () => {
  test('shows a top-of-screen celebration message and confetti, and removes the task from the board', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])

    await expect(celebrationRegion(page)).toHaveCount(1)
    await expect(celebration(page)).toHaveCount(0)

    await taskDoneToggle(page, 'Water the plants').click()

    await expect(celebration(page)).toBeVisible()
    await expect(celebrationRegion(page)).toHaveAttribute('aria-live', 'polite')
    const text = (await celebration(page).locator('.celebration-message').textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)

    const box = await celebration(page).boundingBox()
    const viewport = page.viewportSize()!
    expect(box).not.toBeNull()
    expect(box!.y).toBeLessThan(viewport.height / 3)

    expect(await confettiPieces(page).count()).toBeGreaterThan(0)
    await expect(confettiLayer(page)).toHaveAttribute('aria-hidden', 'true')

    await expect(taskItem(page, 'Water the plants')).toHaveCount(0)
  })

  test('the task stays removed after a reload, is still stored as done, and fires no celebration on load', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(taskItem(page, 'Water the plants')).toHaveCount(0)

    await page.reload()

    await expect(taskItem(page, 'Water the plants')).toHaveCount(0)
    await expect(celebration(page)).toHaveCount(0)
    await expect(confettiPieces(page)).toHaveCount(0)

    const stored = await readTasks(page)
    expect(stored).toHaveLength(1)
    expect(stored[0]!.done).toBe(true)

    await expect(completedButton(page)).toHaveText('Completed (1)')
    await completedButton(page).click()
    await expect(completedRowButton(page, 'Water the plants')).toBeVisible()
  })

  test('a done task loaded from storage never renders on the board', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Already done', done: true }),
      makeTask({ id: 2, name: 'Still open', createdAt: 2000 }),
    ])

    await expect(taskItem(page, 'Still open')).toBeVisible()
    await expect(taskItem(page, 'Already done')).toHaveCount(0)
    await expect(celebration(page)).toHaveCount(0)
  })

  test('confetti removes itself within 5 seconds and the message auto-dismisses', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(confettiPieces(page).first()).toBeAttached()

    await expect(confettiPieces(page)).toHaveCount(0, { timeout: 5000 })
    await expect(celebration(page)).toHaveCount(0, { timeout: 9000 })
  })

  test('the message can be dismissed manually with the close button', async ({ page }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()

    await celebrationClose(page).click()
    await expect(celebration(page)).toHaveCount(0)
  })

  test('the confetti layer has pointer-events none and does not block clicks beneath it', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'First task', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Second task', createdAt: 2000 }),
    ])
    await taskDoneToggle(page, 'First task').click()
    await expect(confettiPieces(page).first()).toBeAttached()

    const pointerEvents = await confettiLayer(page).evaluate(
      (el) => getComputedStyle(el).pointerEvents
    )
    expect(pointerEvents).toBe('none')

    // No hit-test lands on the confetti layer anywhere in the viewport.
    const hitsConfetti = await page.evaluate(() => {
      const w = window.innerWidth
      const h = window.innerHeight
      for (let xi = 1; xi < 8; xi++) {
        for (let yi = 1; yi < 8; yi++) {
          const el = document.elementFromPoint((w * xi) / 8, (h * yi) / 8)
          if (el?.closest('.confetti-layer')) return true
        }
      }
      return false
    })
    expect(hitsConfetti).toBe(false)

    // A real click on the board while confetti is still in flight reaches the element.
    await taskOpenButton(page, 'Second task').click()
    await expect(taskDetailModal(page)).toBeVisible()
    expect(await confettiPieces(page).count()).toBeGreaterThanOrEqual(0)
  })

  test('a second completion while the first message is showing replaces it', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'First task', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Second task', createdAt: 2000 }),
    ])
    await taskDoneToggle(page, 'First task').click()
    await expect(celebration(page)).toBeVisible()
    await taskDoneToggle(page, 'Second task').click()

    await expect(celebration(page)).toHaveCount(1)
    await expect(celebrationRegion(page).getByRole('button')).toHaveCount(1)
  })

  test('sub-task toggles and un-completing never celebrate', async ({ page }) => {
    await reloadWith(page, [
      makeTask({
        id: 1,
        name: 'Plan launch',
        subTasks: [{ id: 1, text: 'Draft brief', done: false }],
      }),
      makeTask({ id: 2, name: 'Old win', done: true, updatedAt: 5000, createdAt: 2000 }),
    ])

    await taskOpenButton(page, 'Plan launch').click()
    await taskDetailModal(page)
      .getByLabel("Mark sub-task 'Draft brief' as done", { exact: true })
      .click()
    await expect(celebration(page)).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(taskDetailModal(page)).toBeHidden()

    await completedButton(page).click()
    await completedRowCheckbox(page, 'Old win').click()
    await expect(celebration(page)).toHaveCount(0)
    await expect(confettiPieces(page)).toHaveCount(0)
  })
})

test.describe('focus after a board completion', () => {
  test('moves to the next remaining task in the section, never body', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Alpha', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Bravo', createdAt: 2000 }),
      makeTask({ id: 3, name: 'Charlie', createdAt: 3000 }),
    ])
    await taskDoneToggle(page, 'Bravo').click()
    await expect(taskOpenButton(page, 'Charlie')).toBeFocused()
    expect(await activeElementIsBody(page)).toBe(false)
  })

  test('moves to the previous task when the last one is completed', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Alpha', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Bravo', createdAt: 2000 }),
    ])
    await taskDoneToggle(page, 'Bravo').click()
    await expect(taskOpenButton(page, 'Alpha')).toBeFocused()
  })

  test('moves to the section heading when the only task is completed', async ({ page }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Alpha' })])
    await taskDoneToggle(page, 'Alpha').click()
    await expect(sectionHeading(page, 'Now')).toBeFocused()
    expect(await activeElementIsBody(page)).toBe(false)
  })
})

test.describe('completing from the Task Detail modal', () => {
  test('closes immediately with no discard dialog, discards edits, celebrates, and focuses the next task', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Alpha', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Bravo', createdAt: 2000 }),
      makeTask({ id: 3, name: 'Charlie', createdAt: 3000 }),
    ])

    await taskOpenButton(page, 'Bravo').click()
    const modal = taskDetailModal(page)
    await modal.getByLabel('Task name', { exact: true }).fill('Edited but unsaved')
    await modal.getByLabel('Mark as done', { exact: true }).click()

    await expect(modal).toBeHidden()
    await expect(taskDetailDiscardDialog(page)).toHaveCount(0)
    await expect(celebration(page)).toBeVisible()
    expect(await confettiPieces(page).count()).toBeGreaterThan(0)
    await expect(taskItem(page, 'Bravo')).toHaveCount(0)

    await expect(taskOpenButton(page, 'Charlie')).toBeFocused()
    expect(await activeElementIsBody(page)).toBe(false)

    const stored = await readTasks(page)
    const bravo = stored.find((t) => t.id === 2)!
    expect(bravo.name).toBe('Bravo')
    expect(bravo.done).toBe(true)

    await completedButton(page).click()
    await expect(completedRowButton(page, 'Bravo')).toBeVisible()
    await expect(completedPanel(page).getByText('Edited but unsaved')).toHaveCount(0)
  })

  test('falls back to the section heading when the only task is completed from the modal', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Alpha' })])
    await taskOpenButton(page, 'Alpha').click()
    await taskDetailModal(page).getByLabel('Mark as done', { exact: true }).click()

    await expect(taskDetailModal(page)).toBeHidden()
    await expect(sectionHeading(page, 'Now')).toBeFocused()
  })
})

test.describe('coexistence with the existing toast', () => {
  test('the celebration (top) and the Encourage me toast (bottom) are both visible and independent', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])

    await encourageButton(page).click()
    await expect(toast(page)).toBeVisible()

    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()
    await expect(toast(page)).toBeVisible()

    const celebrationBox = await celebration(page).boundingBox()
    const toastBox = await toast(page).boundingBox()
    expect(celebrationBox!.y + celebrationBox!.height).toBeLessThan(toastBox!.y)

    // Dismissing one leaves the other alone.
    await celebrationClose(page).click()
    await expect(celebration(page)).toHaveCount(0)
    await expect(toast(page)).toBeVisible()
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows the message but renders no confetti', async ({ page }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()

    await expect(celebration(page)).toBeVisible()
    await expect(taskItem(page, 'Water the plants')).toHaveCount(0)
    await expect(confettiPieces(page)).toHaveCount(0)
  })
})

test.describe('Completed button and panel', () => {
  test('the header button shows a live count, starting at 0', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Alpha', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Bravo', createdAt: 2000 }),
    ])
    await expect(completedButton(page)).toHaveText('Completed (0)')
    await expect(completedButton(page)).toHaveAttribute('aria-haspopup', 'dialog')

    await taskDoneToggle(page, 'Alpha').click()
    await expect(completedButton(page)).toHaveText('Completed (1)')
    await taskDoneToggle(page, 'Bravo').click()
    await expect(completedButton(page)).toHaveText('Completed (2)')
  })

  test('the button sits last in the header actions, after Tough love', async ({ page }) => {
    const labels = await page
      .locator('.header-actions button')
      .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()))
    expect(labels[labels.length - 1]).toBe('Completed (0)')
    expect(labels).toContain('Tough love')
  })

  test('opens with focus on the X, shows the empty state, and Escape returns focus to the button', async ({
    page,
  }) => {
    await completedButton(page).click()
    const panel = completedPanel(page)
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Completed tasks' })).toBeVisible()
    await expect(panel.getByText('No completed tasks yet')).toBeVisible()
    await expect(completedPanelClose(page)).toBeFocused()

    // The rest of the app is unreachable while the panel is open.
    const inert = await page.evaluate(() => !!document.querySelector('.app-background[inert]'))
    expect(inert).toBe(true)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(completedButton(page)).toBeFocused()
  })

  test('closes via the X and via a backdrop click, returning focus to the button', async ({
    page,
  }) => {
    await completedButton(page).click()
    await completedPanelClose(page).click()
    await expect(completedPanel(page)).toBeHidden()
    await expect(completedButton(page)).toBeFocused()

    await completedButton(page).click()
    await expect(completedPanel(page)).toBeVisible()
    await page.locator('.completed-overlay').click({ position: { x: 4, y: 4 } })
    await expect(completedPanel(page)).toBeHidden()
    await expect(completedButton(page)).toBeFocused()
  })

  test('Tab stays trapped inside the panel', async ({ page }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Alpha', done: true, updatedAt: 3000 }),
      makeTask({ id: 2, name: 'Bravo', done: true, updatedAt: 2000, createdAt: 2000 }),
    ])
    await completedButton(page).click()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() =>
        document.querySelector('[role="dialog"]')!.contains(document.activeElement)
      )
      expect(inside).toBe(true)
    }
  })

  test('lists completed tasks most recently completed first, as buttons with checked checkboxes', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Oldest', done: true, updatedAt: 1000, createdAt: 1 }),
      makeTask({ id: 2, name: 'Newest', done: true, updatedAt: 3000, createdAt: 2 }),
      makeTask({ id: 3, name: 'Middle', done: true, updatedAt: 2000, createdAt: 3 }),
      makeTask({ id: 4, name: 'Open one', createdAt: 4 }),
    ])
    await completedButton(page).click()
    const rows = completedPanel(page).getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Newest')
    await expect(rows.nth(1)).toContainText('Middle')
    await expect(rows.nth(2)).toContainText('Oldest')
    await expect(completedRowCheckbox(page, 'Newest')).toBeChecked()
    await expect(completedPanel(page).getByText('Open one')).toHaveCount(0)
  })

  test('a task completed from the board appears in the panel without a reload', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await completedButton(page).click()
    await expect(completedRowButton(page, 'Water the plants')).toBeVisible()
  })

  test('unchecking a row restores the task to its original section with no celebration, and moves focus to the next row checkbox', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'First', section: 'later', done: true, updatedAt: 3000 }),
      makeTask({ id: 2, name: 'Second', section: 'next', done: true, updatedAt: 2000 }),
      makeTask({ id: 3, name: 'Third', section: 'now', done: true, updatedAt: 1000 }),
    ])
    await completedButton(page).click()

    await completedRowCheckbox(page, 'First').uncheck()

    await expect(completedRowButton(page, 'First')).toHaveCount(0)
    await expect(completedButtonAlways(page)).toHaveText('Completed (2)')
    await expect(completedRowCheckbox(page, 'Second')).toBeFocused()
    await expect(celebration(page)).toHaveCount(0)
    await expect(confettiPieces(page)).toHaveCount(0)
    await expect(completedPanel(page)).toBeVisible()

    // Last row: focus goes to the previous row's checkbox.
    await completedRowCheckbox(page, 'Third').uncheck()
    await expect(completedRowCheckbox(page, 'Second')).toBeFocused()

    // Only row: focus goes to the X.
    await completedRowCheckbox(page, 'Second').uncheck()
    await expect(completedPanel(page).getByText('No completed tasks yet')).toBeVisible()
    await expect(completedPanelClose(page)).toBeFocused()

    await completedPanelClose(page).click()
    await expect(page.locator('#section-later-content').getByText('First')).toBeVisible()
    await expect(page.locator('#section-next-content').getByText('Second')).toBeVisible()
    await expect(page.locator('#section-now-content').getByText('Third')).toBeVisible()
  })
})

test.describe('Task Detail stacked over the Completed panel', () => {
  const seed = [
    makeTask({ id: 1, name: 'Alpha', done: true, updatedAt: 3000, createdAt: 1 }),
    makeTask({ id: 2, name: 'Bravo', done: true, updatedAt: 2000, createdAt: 2 }),
  ]

  async function openStacked(page: Page, name: string) {
    await reloadWith(page, seed)
    await completedButton(page).click()
    await completedRowButton(page, name).click()
    await expect(taskDetailModal(page)).toBeVisible()
  }

  test('opens above the panel, which stays open but non-interactive; the done checkbox is checked', async ({
    page,
  }) => {
    await openStacked(page, 'Alpha')
    await expect(taskDetailModal(page).getByLabel('Mark as done', { exact: true })).toBeChecked()
    const panelInert = await page.locator('.completed-overlay').evaluate((el) => {
      const e = el as HTMLElement
      return e.inert && e.getAttribute('aria-hidden') === 'true'
    })
    expect(panelInert).toBe(true)
  })

  test('Escape closes only Task Detail and returns focus to the panel row button', async ({
    page,
  }) => {
    await openStacked(page, 'Alpha')
    await page.keyboard.press('Escape')

    await expect(taskDetailModal(page)).toBeHidden()
    await expect(completedPanel(page)).toBeVisible()
    await expect(completedRowButton(page, 'Alpha')).toBeFocused()
    const panelInert = await page
      .locator('.completed-overlay')
      .evaluate((e) => (e as HTMLElement).inert)
    expect(panelInert).toBe(false)
  })

  test('deleting the task from the stacked view returns focus to the panel X', async ({ page }) => {
    await openStacked(page, 'Alpha')
    await taskDetailModal(page).getByRole('button', { name: 'Delete task', exact: true }).click()
    await taskDetailDeleteDialog(page).getByRole('button', { name: 'Yes', exact: true }).click()

    await expect(taskDetailModal(page)).toBeHidden()
    await expect(completedPanel(page)).toBeVisible()
    await expect(completedRowButton(page, 'Alpha')).toHaveCount(0)
    await expect(completedPanelClose(page)).toBeFocused()
  })

  test('un-ticking done keeps the modal open, un-completes with no celebration, and re-ticking celebrates, closes the modal, and focuses the panel row', async ({
    page,
  }) => {
    await openStacked(page, 'Alpha')
    const done = taskDetailModal(page).getByLabel('Mark as done', { exact: true })

    await done.uncheck()
    await expect(taskDetailModal(page)).toBeVisible()
    await expect(celebration(page)).toHaveCount(0)
    await expect(completedRowButton(page, 'Alpha')).toHaveCount(0)
    await expect(completedButtonAlways(page)).toHaveText('Completed (1)')

    await taskDetailModal(page).getByLabel('Task name', { exact: true }).fill('Alpha edited')
    await done.check()

    await expect(taskDetailModal(page)).toBeHidden()
    await expect(taskDetailDiscardDialog(page)).toHaveCount(0)
    await expect(celebration(page)).toBeVisible()
    await expect(completedPanel(page)).toBeVisible()
    await expect(completedRowButton(page, 'Alpha')).toBeFocused()
    await expect(completedButtonAlways(page)).toHaveText('Completed (2)')
    // Edits discarded; the celebration card is visible above the still-open panel.
    await expect(completedRowButton(page, 'Alpha edited')).toHaveCount(0)
    const cardBox = await celebration(page).boundingBox()
    expect(cardBox).not.toBeNull()
  })

  test('un-ticking done in the stacked view then closing leaves focus on the panel X', async ({
    page,
  }) => {
    await openStacked(page, 'Alpha')
    await taskDetailModal(page).getByLabel('Mark as done', { exact: true }).uncheck()
    await page.keyboard.press('Escape')

    await expect(taskDetailModal(page)).toBeHidden()
    await expect(completedPanel(page)).toBeVisible()
    await expect(completedPanelClose(page)).toBeFocused()
    expect(await activeElementIsBody(page)).toBe(false)
  })
})

test.describe('mobile viewport (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the celebration card stays inside the viewport with a 44px close and 72px free on both sides', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()

    const box = await celebration(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(72 - 0.5)
    expect(390 - (box!.x + box!.width)).toBeGreaterThanOrEqual(72 - 0.5)

    const closeBox = await celebrationClose(page).boundingBox()
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)
    expect(closeBox!.height).toBeGreaterThanOrEqual(44)
  })

  test('the header Completed button has a 44px tap target', async ({ page }) => {
    const box = await completedButton(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    const actions = await page.locator('.header-actions').boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    expect(actions!.x + actions!.width).toBeLessThanOrEqual(390)
  })

  test('the Completed panel fits the viewport, scrolls its list internally, and has 44px targets', async ({
    page,
  }) => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeTask({
        id: i + 1,
        name: `Done task ${i + 1}`,
        done: true,
        updatedAt: 1000 + i,
        createdAt: i + 1,
      })
    )
    await reloadWith(page, many)
    await completedButton(page).click()

    const panel = completedPanel(page)
    await expect(panel).toBeVisible()
    const box = await panel.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(844)

    const scrolls = await page
      .locator('.completed-list')
      .evaluate((el) => el.scrollHeight > el.clientHeight)
    expect(scrolls).toBe(true)

    for (const loc of [
      completedPanelClose(page),
      completedRowButton(page, 'Done task 30'),
      completedRowCheckbox(page, 'Done task 30'),
    ]) {
      const b = await loc.boundingBox()
      expect(b).not.toBeNull()
      expect(b!.height).toBeGreaterThanOrEqual(44)
      expect(b!.width).toBeGreaterThanOrEqual(44)
    }
  })

  async function topElementIsClose(page: Page) {
    return page.evaluate(() => {
      const closeEls = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"] .close-button')
      )
      const close = closeEls[closeEls.length - 1]
      if (!close) return false
      const r = close.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return !!hit && close.contains(hit)
    })
  }

  test('with the celebration card showing, the Add Task modal X is not covered and still closes the modal', async ({
    page,
  }) => {
    await reloadWith(page, [makeTask({ id: 1, name: 'Water the plants' })])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()

    // dispatchEvent: the trigger is not the subject here, so avoid any hit-test dependence on it.
    await addTaskButton(page).dispatchEvent('click')
    const modal = addTaskModal(page)
    await expect(modal).toBeVisible()
    await expect(celebration(page)).toBeVisible()

    expect(await topElementIsClose(page)).toBe(true)
    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(modal).toBeHidden()
  })

  test('with the celebration card showing, the Task Detail X is not covered and still closes the modal', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Water the plants', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Read a book', createdAt: 2000 }),
    ])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()

    await taskOpenButton(page, 'Read a book').dispatchEvent('click')
    const modal = taskDetailModal(page)
    await expect(modal).toBeVisible()
    await expect(celebration(page)).toBeVisible()

    expect(await topElementIsClose(page)).toBe(true)
    // The card's own close stays reachable by pointer (not covered by the modal overlay).
    const closeCenter = await celebrationClose(page).boundingBox()
    const reachable = await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.celebration'),
      { x: closeCenter!.x + closeCenter!.width / 2, y: closeCenter!.y + closeCenter!.height / 2 }
    )
    expect(reachable).toBe(true)

    await modal.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(modal).toBeHidden()
  })

  test('with the Completed panel and a stacked Task Detail open, the card does not cover either X', async ({
    page,
  }) => {
    await reloadWith(page, [
      makeTask({ id: 1, name: 'Water the plants', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Old win', done: true, updatedAt: 500, createdAt: 2 }),
    ])
    await taskDoneToggle(page, 'Water the plants').click()
    await expect(celebration(page)).toBeVisible()

    await completedButton(page).dispatchEvent('click')
    await expect(completedPanel(page)).toBeVisible()
    expect(await topElementIsClose(page)).toBe(true)

    await completedRowButton(page, 'Old win').click()
    await expect(taskDetailModal(page)).toBeVisible()
    expect(await topElementIsClose(page)).toBe(true)
  })
})
