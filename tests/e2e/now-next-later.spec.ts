import type { Page } from '@playwright/test'
import { test, expect } from './coverage-fixture'
import { sectionToggle, sectionContent, taskList, taskItem, taskDoneToggle } from './helpers'

const TASKS_STORAGE_KEY = 'untangle:tasks'

// Local test fixture builder — mirrors the Task shape from design.md (docs/adr/0003), but this
// spec doesn't import the real module (it doesn't exist yet); it seeds localStorage directly to
// exercise the store's hydration/rendering path in a real browser.
function makeTask(overrides: Record<string, unknown> = {}) {
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

async function seedTasks(page: Page, tasks: Record<string, unknown>[]) {
  await page.evaluate(({ key, tasks }) => localStorage.setItem(key, JSON.stringify(tasks)), {
    key: TASKS_STORAGE_KEY,
    tasks,
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('desktop viewport (>640px)', () => {
  test('renders the three sections as columns, side by side', async ({ page }) => {
    const nowBox = await page.getByRole('region', { name: 'Now', exact: true }).boundingBox()
    const nextBox = await page.getByRole('region', { name: 'Next', exact: true }).boundingBox()
    const laterBox = await page.getByRole('region', { name: 'Later', exact: true }).boundingBox()

    expect(nowBox).not.toBeNull()
    expect(nextBox).not.toBeNull()
    expect(laterBox).not.toBeNull()

    // Columns: roughly the same vertical position, strictly increasing horizontal position.
    expect(Math.abs(nextBox!.y - nowBox!.y)).toBeLessThan(20)
    expect(Math.abs(laterBox!.y - nowBox!.y)).toBeLessThan(20)
    expect(nextBox!.x).toBeGreaterThan(nowBox!.x)
    expect(laterBox!.x).toBeGreaterThan(nextBox!.x)
  })

  test('exposes no collapse/expand toggle button to the accessibility tree', async ({ page }) => {
    const toggles = page.getByRole('button', { name: /^(Collapse|Expand) (Now|Next|Later)$/ })
    await expect(toggles).toHaveCount(0)
  })

  test('renders all three section content regions as visible', async ({ page }) => {
    await expect(sectionContent(page, 'now')).toBeVisible()
    await expect(sectionContent(page, 'next')).toBeVisible()
    await expect(sectionContent(page, 'later')).toBeVisible()
  })
})

test.describe('mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('stacks the three sections as rows spanning close to the full width', async ({ page }) => {
    const nowBox = await page.getByRole('region', { name: 'Now', exact: true }).boundingBox()
    const nextBox = await page.getByRole('region', { name: 'Next', exact: true }).boundingBox()
    const laterBox = await page.getByRole('region', { name: 'Later', exact: true }).boundingBox()

    expect(nowBox).not.toBeNull()
    expect(nextBox).not.toBeNull()
    expect(laterBox).not.toBeNull()

    expect(nextBox!.y).toBeGreaterThan(nowBox!.y)
    expect(laterBox!.y).toBeGreaterThan(nextBox!.y)
    for (const box of [nowBox, nextBox, laterBox]) {
      expect(box!.width).toBeGreaterThan(300)
    }
  })

  test('exposes a visible toggle per section with an accessible name including the label', async ({
    page,
  }) => {
    await expect(sectionToggle(page, 'Now')).toBeVisible()
    await expect(sectionToggle(page, 'Next')).toBeVisible()
    await expect(sectionToggle(page, 'Later')).toBeVisible()

    await expect(sectionToggle(page, 'Now')).toHaveAttribute('aria-label', 'Collapse Now')
    await expect(sectionToggle(page, 'Next')).toHaveAttribute('aria-label', 'Collapse Next')
    await expect(sectionToggle(page, 'Later')).toHaveAttribute('aria-label', 'Collapse Later')

    // Icon-only button: the visible rendered text is the chevron glyph only, not the old wording.
    // aria-hidden only removes the chevron from the accessibility tree, not from innerText.
    expect(await sectionToggle(page, 'Now').innerText()).toBe('▾')
  })

  test('gives the section toggle a 44px minimum tap target', async ({ page }) => {
    for (const label of ['Now', 'Next', 'Later']) {
      const box = await sectionToggle(page, label).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('collapsing one section does not affect the other two (independence)', async ({ page }) => {
    await sectionToggle(page, 'Now').click()

    await expect(sectionContent(page, 'now')).toBeHidden()
    await expect(sectionContent(page, 'next')).toBeVisible()
    await expect(sectionContent(page, 'later')).toBeVisible()
  })

  test('clicking a toggle flips its aria-expanded attribute and accessible name', async ({
    page,
  }) => {
    const toggle = sectionToggle(page, 'Now')

    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toHaveAttribute('aria-label', 'Collapse Now')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-label', 'Expand Now')
  })

  test('has aria-controls on the toggle referencing the content region id', async ({ page }) => {
    const toggle = sectionToggle(page, 'Now')
    await expect(toggle).toHaveAttribute('aria-controls', 'section-now-content')
  })

  test('is keyboard operable via Enter and Space', async ({ page }) => {
    const toggle = sectionToggle(page, 'Now')
    await toggle.focus()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  test('shows a visible focus indicator when a toggle is focused', async ({ page }) => {
    const toggle = sectionToggle(page, 'Now')
    await toggle.focus()

    const style = await toggle.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth }
    })

    expect(style.outlineStyle).not.toBe('none')
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0)
  })

  test('reload resets collapsed sections back to fully expanded', async ({ page }) => {
    await sectionToggle(page, 'Now').click()
    await expect(sectionContent(page, 'now')).toBeHidden()

    await page.reload()

    await expect(sectionContent(page, 'now')).toBeVisible()
    await expect(sectionToggle(page, 'Now')).toHaveAttribute('aria-expanded', 'true')
  })
})

test.describe('cross-breakpoint persistence (Requirement 7)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('collapse state survives resizing across the 640px breakpoint', async ({ page }) => {
    await sectionToggle(page, 'Now').click()
    await expect(sectionContent(page, 'now')).toBeHidden()

    await page.setViewportSize({ width: 1280, height: 800 })

    // Above 640px, Requirement 3 forces content visible regardless of stored state,
    // and no toggle button is exposed to the accessibility tree.
    await expect(sectionContent(page, 'now')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^(Collapse|Expand) (Now|Next|Later)$/ })
    ).toHaveCount(0)

    await page.setViewportSize({ width: 375, height: 812 })

    // Resizing back down reveals the state was preserved in memory the whole time,
    // not reset by the round-trip across the breakpoint.
    await expect(sectionContent(page, 'now')).toBeHidden()
    await expect(sectionContent(page, 'next')).toBeVisible()
    await expect(sectionContent(page, 'later')).toBeVisible()
  })
})

test.describe('real task rendering (Requirements 12-24)', () => {
  test('a task renders only in its assigned section', async ({ page }) => {
    await seedTasks(page, [
      makeTask({ id: 1, name: 'Now task', section: 'now', createdAt: 1000 }),
      makeTask({ id: 2, name: 'Next task', section: 'next', createdAt: 2000 }),
    ])
    await page.reload()

    await expect(taskList(page, 'now')).toContainText('Now task')
    await expect(taskList(page, 'now')).not.toContainText('Next task')
    await expect(taskList(page, 'next')).toContainText('Next task')
    await expect(taskList(page, 'next')).not.toContainText('Now task')
  })

  test('multiple tasks in one section render in ascending creation order', async ({ page }) => {
    await seedTasks(page, [
      makeTask({ id: 1, name: 'First task', section: 'now', createdAt: 2000 }),
      makeTask({ id: 2, name: 'Second task', section: 'now', createdAt: 3000 }),
    ])
    await page.reload()

    const items = taskList(page, 'now').getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('First task')
    await expect(items.nth(1)).toContainText('Second task')
  })

  test('clicking a task checkbox toggles its done styling and persists across a reload', async ({
    page,
  }) => {
    await seedTasks(page, [makeTask({ id: 1, name: 'Water the plants', section: 'now' })])
    await page.reload()

    const checkbox = taskDoneToggle(page, 'Water the plants')
    const item = taskItem(page, 'Water the plants')

    await expect(checkbox).not.toBeChecked()
    await expect(item.locator('.task-name--done')).toHaveCount(0)

    await checkbox.click()

    await expect(checkbox).toBeChecked()
    await expect(item.locator('.task-name--done')).toHaveCount(1)

    await page.reload()

    await expect(taskDoneToggle(page, 'Water the plants')).toBeChecked()
    await expect(taskItem(page, 'Water the plants').locator('.task-name--done')).toHaveCount(1)
  })

  test('the task done-toggle is reachable via Tab and toggled via Space', async ({ page }) => {
    await seedTasks(page, [makeTask({ id: 1, name: 'Read a book', section: 'now' })])
    await page.reload()

    const checkbox = taskDoneToggle(page, 'Read a book')

    // Tab from the top of the document until focus lands on the checkbox (bounded to avoid an
    // infinite loop if the control were ever removed from the tab order).
    let reached = false
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await checkbox.evaluate((el) => el === document.activeElement)
    }
    expect(reached).toBe(true)

    await expect(checkbox).not.toBeChecked()
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
  })

  test('the task done-toggle shows a visible focus indicator when focused', async ({ page }) => {
    await seedTasks(page, [makeTask({ id: 1, name: 'Read a book', section: 'now' })])
    await page.reload()

    const checkbox = taskDoneToggle(page, 'Read a book')
    await checkbox.focus()

    const style = await checkbox.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth }
    })

    expect(style.outlineStyle).not.toBe('none')
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0)
  })

  test.describe('mobile viewport (375x812)', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('a task in a collapsed section is not visible until the section is expanded', async ({
      page,
    }) => {
      await seedTasks(page, [makeTask({ id: 1, name: 'Read a book', section: 'now' })])
      await page.reload()

      await sectionToggle(page, 'Now').click()
      await expect(sectionContent(page, 'now')).toBeHidden()
      await expect(taskItem(page, 'Read a book')).toBeHidden()

      await sectionToggle(page, 'Now').click()
      await expect(taskItem(page, 'Read a book')).toBeVisible()
    })
  })
})
