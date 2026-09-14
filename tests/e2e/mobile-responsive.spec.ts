import { test, expect } from './coverage-fixture'
import {
  energyButton,
  encourageButton,
  toughLoveButton,
  toast,
  addTaskButton,
  addTaskModal,
  closeConfirmDialog,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('stacks the header vertically instead of side-by-side', async ({ page }) => {
    const brandBox = await page.locator('.brand-text').boundingBox()
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(brandBox).not.toBeNull()
    expect(actionsBox).not.toBeNull()
    expect(actionsBox!.y).toBeGreaterThan(brandBox!.y + brandBox!.height)
  })

  test('keeps the header actions within the viewport width', async ({ page }) => {
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(actionsBox).not.toBeNull()
    expect(actionsBox!.x + actionsBox!.width).toBeLessThanOrEqual(375)
  })

  test('gives energy-level buttons, the Encourage me button, and the Tough love button a 44px minimum tap target', async ({
    page,
  }) => {
    for (const label of ['Low', 'Medium', 'High']) {
      const box = await energyButton(page, label).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }

    const encourageBox = await encourageButton(page).boundingBox()
    expect(encourageBox).not.toBeNull()
    expect(encourageBox!.height).toBeGreaterThanOrEqual(44)

    const toughLoveBox = await toughLoveButton(page).boundingBox()
    expect(toughLoveBox).not.toBeNull()
    expect(toughLoveBox!.height).toBeGreaterThanOrEqual(44)
  })

  test('keeps the toast within the viewport and gives its close button a 44px tap target', async ({
    page,
  }) => {
    await energyButton(page, 'Low').click()
    await expect(toast(page)).toBeVisible()

    const toastBox = await toast(page).boundingBox()
    expect(toastBox).not.toBeNull()
    expect(toastBox!.x).toBeGreaterThan(8)
    expect(375 - (toastBox!.x + toastBox!.width)).toBeGreaterThan(8)

    const closeBox = await page.getByRole('button', { name: 'Dismiss' }).boundingBox()
    expect(closeBox).not.toBeNull()
    expect(closeBox!.height).toBeGreaterThanOrEqual(44)
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)

    const justifyContent = await toast(page).evaluate((el) => getComputedStyle(el).justifyContent)
    expect(justifyContent).toBe('space-between')
  })

  test('gives the Add Task trigger button a 44px minimum tap target', async ({ page }) => {
    const box = await addTaskButton(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.width).toBeGreaterThanOrEqual(44)
  })

  test('gives every Add Task modal control a 44px minimum tap target (Requirement 35)', async ({
    page,
  }) => {
    await addTaskButton(page).click()
    const modal = addTaskModal(page)
    await expect(modal).toBeVisible()

    const closeButton = modal.getByRole('button', { name: 'Close', exact: true })
    const saveButton = modal.getByRole('button', { name: 'Save', exact: true })
    const addSubTaskButton = modal.getByRole('button', { name: 'Add sub-task', exact: true })

    for (const control of [closeButton, saveButton, addSubTaskButton]) {
      const box = await control.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }

    for (const label of ['Now', 'Next', 'Later']) {
      const box = await modal.getByRole('button', { name: label, exact: true }).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }

    await addSubTaskButton.click()
    await modal.getByLabel('New sub-task', { exact: true }).fill('Draft outline')
    await modal.getByRole('button', { name: 'Save', exact: true }).first().click()

    const deleteBox = await modal
      .getByRole('button', { name: 'Delete sub-task: Draft outline', exact: true })
      .boundingBox()
    expect(deleteBox).not.toBeNull()
    expect(deleteBox!.height).toBeGreaterThanOrEqual(44)
    expect(deleteBox!.width).toBeGreaterThanOrEqual(44)

    await closeButton.click()

    const confirm = closeConfirmDialog(page)
    await expect(confirm).toBeVisible()

    const yesBox = await confirm.getByRole('button', { name: 'Yes', exact: true }).boundingBox()
    expect(yesBox).not.toBeNull()
    expect(yesBox!.height).toBeGreaterThanOrEqual(44)
    expect(yesBox!.width).toBeGreaterThanOrEqual(44)

    const noBox = await confirm.getByRole('button', { name: 'No', exact: true }).boundingBox()
    expect(noBox).not.toBeNull()
    expect(noBox!.height).toBeGreaterThanOrEqual(44)
    expect(noBox!.width).toBeGreaterThanOrEqual(44)
  })
})

test.describe('desktop viewport (unchanged above 640px)', () => {
  test('keeps the header actions on the same row as the logo', async ({ page }) => {
    const brandBox = await page.locator('.brand-text').boundingBox()
    const actionsBox = await page.locator('.header-actions').boundingBox()

    expect(brandBox).not.toBeNull()
    expect(actionsBox).not.toBeNull()
    expect(Math.abs(actionsBox!.y - brandBox!.y)).toBeLessThan(20)
  })
})
