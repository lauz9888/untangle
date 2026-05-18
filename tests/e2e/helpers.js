/** Add a task via the column form, optionally selecting an energy level. */
export async function addTask(page, column, title, { energy } = {}) {
  await page.locator(`[data-column="${column}"] [data-testid="add-task-btn"]`).click()
  await page.locator(`[data-column="${column}"] [data-testid="task-input"]`).fill(title)
  if (energy) {
    await page
      .locator(`[data-column="${column}"] [data-testid="add-task-form"] .energy-opt`)
      .filter({ hasText: new RegExp(`^${energy}$`, 'i') })
      .click()
  }
  await page.locator(`[data-column="${column}"] .btn-primary`).click()
}

/** Return the task-card locator for a given column and title (display mode only). */
export function taskCard(page, column, titleText) {
  return page.locator(`[data-column="${column}"] .task-card`).filter({ hasText: titleText })
}

/**
 * Open the edit form for a task card.
 * Returns the `.task-card.is-editing` locator — hasText breaks once the title
 * moves into an <input> value, so we switch to the is-editing class selector.
 */
export async function openEdit(page, column, title) {
  const card = taskCard(page, column, title)
  await card.hover()
  await card.locator('[data-testid="edit-btn"]').click()
  return page.locator('.task-card.is-editing')
}
