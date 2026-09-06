import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './coverage-fixture'
import { energyButton, encourageButton, toughLoveButton, toast, sectionToggle } from './helpers'

// Scope to actual WCAG 2.1 A/AA success criteria, not axe-core's broader
// "best-practice" rule set. Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('home page has no detectable accessibility violations', async ({ page }) => {
  // Also covers the Now/Next/Later board's default desktop viewport, full-page,
  // all-expanded state (Requirement 15) — no separate test needed since the board
  // renders unconditionally as part of the home page.
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with an energy-level toast showing', async ({ page }) => {
  await energyButton(page, 'Low').click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Encourage me toast showing', async ({ page }) => {
  await encourageButton(page).click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test('has no violations with the Tough love toast showing', async ({ page }) => {
  await toughLoveButton(page).click()
  await expect(toast(page)).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations).toEqual([])
})

test.describe('Now/Next/Later sections at mobile viewport (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('has no violations with a section collapsed', async ({ page }) => {
    await sectionToggle(page, 'Now').click()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(results.violations).toEqual([])
  })
})
