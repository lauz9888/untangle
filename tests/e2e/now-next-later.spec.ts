import { test, expect } from './coverage-fixture'
import { sectionToggle, sectionContent } from './helpers'

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

    await expect(sectionToggle(page, 'Now')).toContainText('Collapse Now')
    await expect(sectionToggle(page, 'Next')).toContainText('Collapse Next')
    await expect(sectionToggle(page, 'Later')).toContainText('Collapse Later')
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
    await expect(toggle).toContainText('Collapse Now')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(toggle).toContainText('Expand Now')
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
      page.getByRole('button', { name: /^(Collapse|Expand) (Now|Next|Later)$/ }),
    ).toHaveCount(0)

    await page.setViewportSize({ width: 375, height: 812 })

    // Resizing back down reveals the state was preserved in memory the whole time,
    // not reset by the round-trip across the breakpoint.
    await expect(sectionContent(page, 'now')).toBeHidden()
    await expect(sectionContent(page, 'next')).toBeVisible()
    await expect(sectionContent(page, 'later')).toBeVisible()
  })
})
