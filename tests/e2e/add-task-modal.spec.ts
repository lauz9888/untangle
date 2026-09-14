import { test, expect } from './coverage-fixture'
import { addTaskButton, addTaskModal, closeConfirmDialog } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('trigger button opens the modal with initial focus on Task name', async ({ page }) => {
  await addTaskButton(page).click()

  const modal = addTaskModal(page)
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toBeFocused()
})

test('Tab from the last focusable element wraps to the first, and Shift+Tab wraps back', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  const taskName = modal.getByLabel('Task name', { exact: true })
  await expect(taskName).toBeFocused()

  // The design documents Save as the last element in the modal's own tab order,
  // with no sub-task draft open here so it's the only "Save"-named button.
  const saveButton = modal.getByRole('button', { name: 'Save', exact: true })
  await saveButton.focus()

  await page.keyboard.press('Tab')
  await expect(taskName).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(saveButton).toBeFocused()
})

test('Escape with nothing entered closes the modal immediately and returns focus to the trigger', async ({
  page,
}) => {
  await addTaskButton(page).click()
  await expect(addTaskModal(page)).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(addTaskModal(page)).toBeHidden()
  await expect(closeConfirmDialog(page)).toBeHidden()
  await expect(addTaskButton(page)).toBeFocused()
})

test('entering a Task name then Escape opens the confirmation; Yes discards everything and returns focus to the trigger; reopening starts fresh', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')

  await page.keyboard.press('Escape')

  const confirm = closeConfirmDialog(page)
  await expect(confirm).toBeVisible()
  await expect(modal).toBeVisible()

  await confirm.getByRole('button', { name: 'Yes', exact: true }).click()

  await expect(confirm).toBeHidden()
  await expect(modal).toBeHidden()
  await expect(addTaskButton(page)).toBeFocused()

  await addTaskButton(page).click()
  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('')
})

test('closing via the X button with entered values shows the confirmation; No keeps the modal open with values intact and returns focus to the X button', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')

  const closeButton = modal.getByRole('button', { name: 'Close', exact: true })
  await closeButton.click()

  const confirm = closeConfirmDialog(page)
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'No', exact: true }).click()

  await expect(confirm).toBeHidden()
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('Write report')
  await expect(closeButton).toBeFocused()
})

test('closing via a backdrop click with entered values shows the confirmation; No keeps the modal open with values intact', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')

  // Click on the overlay itself (its own top-left corner, away from the centered
  // dialog content) so it lands on the backdrop, not bubbled up from a child.
  await page.locator('.add-task-overlay').click({ position: { x: 2, y: 2 } })

  const confirm = closeConfirmDialog(page)
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: 'No', exact: true }).click()

  await expect(confirm).toBeHidden()
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('Write report')
})

test('Save with an empty Task name shows the inline error and keeps focus in the field; the modal stays open', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)

  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeVisible()
  await expect(modal.getByRole('alert')).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toBeFocused()
})

test('Save with a Task name closes the modal even with every other field left at its default', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')

  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeHidden()
})

test('Due by before Available from shows an error and blocks Save; correcting the date allows Save to proceed', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')
  await modal.getByLabel('Available from', { exact: true }).fill('2026-09-20')
  await modal.getByLabel('Due by', { exact: true }).fill('2026-09-10')

  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeVisible()
  await expect(modal.getByRole('alert')).toBeVisible()

  await modal.getByLabel('Due by', { exact: true }).fill('2026-09-25')
  await modal.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(modal).toBeHidden()
})

test('adding two sub-tasks and deleting the first leaves only the second, in order', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  const addSubTask = modal.getByRole('button', { name: 'Add sub-task', exact: true })

  await addSubTask.click()
  await modal.getByLabel('New sub-task', { exact: true }).fill('Draft outline')
  // The sub-task Save button precedes the modal's own Save button in DOM/tab order.
  await modal.getByRole('button', { name: 'Save', exact: true }).first().click()

  await addSubTask.click()
  await modal.getByLabel('New sub-task', { exact: true }).fill('Proofread')
  await modal.getByRole('button', { name: 'Save', exact: true }).first().click()

  const items = modal.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Draft outline')
  await expect(items.nth(1)).toContainText('Proofread')

  await modal.getByRole('button', { name: 'Delete sub-task: Draft outline', exact: true }).click()

  await expect(items).toHaveCount(1)
  await expect(items.nth(0)).toContainText('Proofread')
})

test('a second Escape while the confirmation dialog is open acts as No and does not also close the Add Task modal (#116)', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await modal.getByLabel('Task name', { exact: true }).fill('Write report')

  await page.keyboard.press('Escape')
  const confirm = closeConfirmDialog(page)
  await expect(confirm).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(confirm).toBeHidden()
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Task name', { exact: true })).toHaveValue('Write report')
  await expect(modal.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
})

test('background content is inert while the Add Task modal is open (#119)', async ({ page }) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)
  await expect(modal).toBeVisible()

  const isInertWhileOpen = await page.evaluate(
    () => (document.querySelector('.app-background') as HTMLElement | null)?.inert
  )
  expect(isInertWhileOpen).toBe(true)

  // Shift+Tab repeatedly from the first focusable element (Task name) should cycle
  // only within the modal's own focus trap, never reaching the background trigger button.
  const taskName = modal.getByLabel('Task name', { exact: true })
  await expect(taskName).toBeFocused()
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Shift+Tab')
    const focusStayedInModal = await page.evaluate(() => {
      const modalEl = document.querySelector('[role="dialog"]')
      return !!modalEl && modalEl.contains(document.activeElement)
    })
    expect(focusStayedInModal).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  const isInertAfterClose = await page.evaluate(
    () => (document.querySelector('.app-background') as HTMLElement | null)?.inert
  )
  expect(isInertAfterClose).toBe(false)
  await expect(addTaskButton(page)).toBeEnabled()
})

test('typing invalid characters into Estimate sub-fields is filtered as the user types (#113)', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)

  const days = modal.getByLabel('Days', { exact: true })
  await days.pressSequentially('-5')
  await expect(days).toHaveValue('5')

  const hours = modal.getByLabel('Hrs', { exact: true })
  await hours.pressSequentially('1.5')
  await expect(hours).toHaveValue('15')
})

test('Estimate row stays a single, non-wrapping line at desktop and mobile widths (#120)', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)

  const days = modal.getByLabel('Days', { exact: true })
  const hours = modal.getByLabel('Hrs', { exact: true })
  const minutes = modal.getByLabel('Min', { exact: true })

  const desktopTops = await Promise.all(
    [days, hours, minutes].map(async (input) => (await input.boundingBox())?.y)
  )
  expect(Math.max(...(desktopTops as number[])) - Math.min(...(desktopTops as number[]))).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 375, height: 812 })

  const mobileTops = await Promise.all(
    [days, hours, minutes].map(async (input) => (await input.boundingBox())?.y)
  )
  expect(Math.max(...(mobileTops as number[])) - Math.min(...(mobileTops as number[]))).toBeLessThanOrEqual(1)

  const mobileHeights = await Promise.all(
    [days, hours, minutes].map(async (input) => (await input.boundingBox())?.height)
  )
  for (const height of mobileHeights) {
    expect(height).toBeGreaterThanOrEqual(44)
  }
})

test('typing above the Hours/Minutes max clamps the displayed value; Days stays uncapped (#121)', async ({
  page,
}) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)

  const hours = modal.getByLabel('Hrs', { exact: true })
  await hours.pressSequentially('99')
  await expect(hours).toHaveValue('23')

  const minutes = modal.getByLabel('Min', { exact: true })
  await minutes.pressSequentially('60')
  await expect(minutes).toHaveValue('59')

  const days = modal.getByLabel('Days', { exact: true })
  await days.pressSequentially('999')
  await expect(days).toHaveValue('999')
})

test('Estimate Hours/Minutes inputs carry the max attribute; Days has none (#121)', async ({ page }) => {
  await addTaskButton(page).click()
  const modal = addTaskModal(page)

  const days = modal.getByLabel('Days', { exact: true })
  const hours = modal.getByLabel('Hrs', { exact: true })
  const minutes = modal.getByLabel('Min', { exact: true })

  await expect(hours).toHaveAttribute('max', '23')
  await expect(minutes).toHaveAttribute('max', '59')
  expect(await days.getAttribute('max')).toBeNull()
})
