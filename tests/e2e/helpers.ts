import type { Page } from '@playwright/test'

export function energyButton(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true })
}

// The shared energy/encourage/tough-love toast. Scoped by class (not bare role=status) because
// the celebration notification adds a second, always-present role=status live region.
export function toast(page: Page) {
  return page.locator('.toast[role="status"]')
}

export function encourageButton(page: Page) {
  return page.getByRole('button', { name: 'Encourage me', exact: true })
}

export function toughLoveButton(page: Page) {
  return page.getByRole('button', { name: 'Tough love', exact: true })
}

export function sectionToggle(page: Page, label: string) {
  return page.getByRole('button', { name: new RegExp(`^(Collapse|Expand) ${label}$`) })
}

export function sectionContent(page: Page, key: string) {
  return page.locator(`#section-${key}-content`)
}

export function addTaskButton(page: Page) {
  return page.getByRole('button', { name: 'Add task', exact: true })
}

export function addTaskModal(page: Page) {
  return page.getByRole('dialog', { name: 'Add Task' })
}

export function closeConfirmDialog(page: Page) {
  return page.getByRole('alertdialog', { name: 'Close without saving?' })
}

export function taskList(page: Page, key: string) {
  return sectionContent(page, key).getByRole('list')
}

export function taskDoneToggle(page: Page, name: string) {
  return page.getByRole('checkbox', { name, exact: true })
}

export function taskItem(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

export function taskOpenButton(page: Page, name: string) {
  return taskItem(page, name).getByRole('button', { name, exact: true })
}

export function taskDetailModal(page: Page) {
  return page.getByRole('dialog', { name: 'Edit Task' })
}

export function taskDetailDiscardDialog(page: Page) {
  return page.getByRole('alertdialog', { name: 'Discard changes?' })
}

export function taskDetailDeleteDialog(page: Page) {
  return page.getByRole('alertdialog', { name: /^Delete this task\?/ })
}

export const TASKS_STORAGE_KEY = 'untangle:tasks'

export function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Task',
    section: 'now',
    description: '',
    energyLevel: null,
    estimate: { days: 0, hours: 0, minutes: 0 },
    availableFrom: null,
    dueBy: null,
    subTasks: [],
    done: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

export async function seedTasks(page: Page, tasks: Record<string, unknown>[]) {
  await page.evaluate(({ key, tasks }) => localStorage.setItem(key, JSON.stringify(tasks)), {
    key: TASKS_STORAGE_KEY,
    tasks,
  })
}

export async function readTasks(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '[]') as Record<string, unknown>[],
    TASKS_STORAGE_KEY
  )
}

// The celebration notification card (inside its always-present role=status live region).
export function celebration(page: Page) {
  return page.getByTestId('celebration')
}

export function celebrationRegion(page: Page) {
  return page.locator('.celebration-region[role="status"]')
}

export function celebrationClose(page: Page) {
  return page.getByRole('button', { name: 'Dismiss celebration', exact: true })
}

export function confettiPieces(page: Page) {
  return page.locator('.confetti-piece')
}

export function confettiLayer(page: Page) {
  return page.getByTestId('confetti-layer')
}

// Header "Completed (N)" button, located by role (only valid while the app is not inert).
export function completedButton(page: Page) {
  return page.getByRole('button', { name: /^Completed \(\d+\)$/ })
}

// Same button regardless of inert/aria-hidden state (for reading the live count under a modal).
export function completedButtonAlways(page: Page) {
  return page.locator('.completed-button')
}

export function completedPanel(page: Page) {
  return page.getByRole('dialog', { name: 'Completed tasks', exact: true })
}

export function completedPanelClose(page: Page) {
  return completedPanel(page).getByRole('button', { name: 'Close', exact: true })
}

export function completedRowButton(page: Page, name: string) {
  return completedPanel(page).getByRole('button', { name, exact: true })
}

export function completedRowCheckbox(page: Page, name: string) {
  return completedPanel(page).getByRole('checkbox', { name, exact: true })
}

export async function activeElementIsBody(page: Page): Promise<boolean> {
  return page.evaluate(() => document.activeElement === document.body || !document.activeElement)
}
