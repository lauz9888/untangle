import { test, expect } from '@playwright/test'
import { addTask, taskCard } from './helpers.js'

test.describe('task management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test.describe('add task form', () => {
    test('clicking Add task reveals the form', async ({ page }) => {
      await page.locator('[data-column="now"] .add-task-btn').click()
      await expect(page.locator('[data-column="now"] .add-task-form')).toBeVisible()
    })

    test('the Add task button hides when form is open', async ({ page }) => {
      await page.locator('[data-column="now"] .add-task-btn').click()
      await expect(page.locator('[data-column="now"] .add-task-btn')).not.toBeVisible()
    })

    test('adds a task to the Now column', async ({ page }) => {
      await addTask(page, 'now', 'Buy groceries')
      await expect(page.locator('[data-column="now"]')).toContainText('Buy groceries')
    })

    test('adds a task to the Next column', async ({ page }) => {
      await addTask(page, 'next', 'Plan holiday')
      await expect(page.locator('[data-column="next"]')).toContainText('Plan holiday')
    })

    test('adds a task to the Future column', async ({ page }) => {
      await addTask(page, 'future', 'Learn Spanish')
      await expect(page.locator('[data-column="future"]')).toContainText('Learn Spanish')
    })

    test('task appears only in the correct column', async ({ page }) => {
      await addTask(page, 'now', 'Now task')
      await expect(page.locator('[data-column="next"]')).not.toContainText('Now task')
      await expect(page.locator('[data-column="future"]')).not.toContainText('Now task')
    })

    test('the form closes after a successful submit', async ({ page }) => {
      await addTask(page, 'now', 'Task')
      await expect(page.locator('[data-column="now"] .add-task-form')).not.toBeVisible()
    })

    test('Cancel button hides the form without adding a task', async ({ page }) => {
      await page.locator('[data-column="now"] .add-task-btn').click()
      await page.locator('[data-column="now"] .task-input').fill('Ghost task')
      await page.locator('[data-column="now"] .btn-secondary').click()
      await expect(page.locator('[data-column="now"] .add-task-form')).not.toBeVisible()
      await expect(page.locator('[data-column="now"]')).not.toContainText('Ghost task')
    })

    test('empty title is rejected — form stays open', async ({ page }) => {
      await page.locator('[data-column="now"] .add-task-btn').click()
      await page.locator('[data-column="now"] .btn-primary').click()
      await expect(page.locator('[data-column="now"] .add-task-form')).toBeVisible()
    })

    test('task shows the energy badge when energy is selected', async ({ page }) => {
      await addTask(page, 'now', 'Huge job', { energy: 'large' })
      await expect(page.locator('[data-column="now"] .energy-badge')).toContainText('large')
    })

    test('no energy badge when None is selected', async ({ page }) => {
      await addTask(page, 'now', 'Simple task')
      await expect(page.locator('[data-column="now"] .energy-badge')).not.toBeVisible()
    })

    test('adds subtasks via the pending-subtask area', async ({ page }) => {
      await page.locator('[data-column="now"] .add-task-btn').click()
      await page.locator('[data-column="now"] .task-input').fill('Task with steps')
      await page.locator('[data-column="now"] .subtask-input').fill('Step one')
      await page.locator('[data-column="now"] .btn-subtle').click()
      await expect(page.locator('[data-column="now"] .pending-subtask-item')).toContainText('Step one')
      await page.locator('[data-column="now"] .btn-primary').click()
      await expect(page.locator('[data-column="now"] .subtask-count')).toContainText('0/1')
    })
  })

  test.describe('delete task', () => {
    test('deletes a task when the delete button is clicked', async ({ page }) => {
      await addTask(page, 'now', 'Delete me')
      const card = taskCard(page, 'now', 'Delete me')
      await card.hover()
      await card.locator('.delete-btn').click()
      await expect(page.locator('[data-column="now"]')).not.toContainText('Delete me')
    })

    test('only deletes the targeted task', async ({ page }) => {
      await addTask(page, 'now', 'Keep me')
      await addTask(page, 'now', 'Delete me')
      const card = taskCard(page, 'now', 'Delete me')
      await card.hover()
      await card.locator('.delete-btn').click()
      await expect(page.locator('[data-column="now"]')).toContainText('Keep me')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Delete me')
    })
  })

  test.describe('complete task', () => {
    test('completing a task removes it from the column', async ({ page }) => {
      await addTask(page, 'now', 'Finish report')
      const card = taskCard(page, 'now', 'Finish report')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('[data-column="now"]')).not.toContainText('Finish report')
    })

    test('only removes the completed task, leaving others', async ({ page }) => {
      await addTask(page, 'now', 'Keep going')
      await addTask(page, 'now', 'Done now')
      const card = taskCard(page, 'now', 'Done now')
      await card.hover()
      await card.locator('.complete-btn').click()
      await expect(page.locator('[data-column="now"]')).toContainText('Keep going')
      await expect(page.locator('[data-column="now"]')).not.toContainText('Done now')
    })
  })
})
