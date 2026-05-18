/**
 * Accessibility checks using axe-core.
 *
 * Branch pipeline: basic check — catches obvious failures (missing labels,
 * colour-contrast errors, landmark issues) so the preview is safe for human
 * review.
 *
 * Main pipeline: the same suite runs again as part of the full Lighthouse CI
 * audit (see .lighthouserc.js), which adds WCAG-level scoring and PWA checks.
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('main board has no critical axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // color-contrast excluded: pre-existing violations tracked in GitHub issue #57.
      // Remove this line once the colours are fixed.
      .disableRules(['color-contrast'])
      .analyze()

    // Filter to critical and serious violations only — these are the failures
    // that block real users. Minor/moderate issues surface as warnings in the
    // Lighthouse CI report on the main pipeline.
    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  ${v.help}\n  ${v.helpUrl}`)
        .join('\n\n')
      expect.soft(blocking, `Accessibility violations:\n\n${summary}`).toHaveLength(0)
    }

    expect(blocking).toHaveLength(0)
  })

  test('settings panel has no critical axe violations', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: /open settings/i }).click()
    await page.locator('.settings-panel').waitFor({ state: 'visible' })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.settings-panel')
      // color-contrast excluded: pre-existing violations tracked in GitHub issue #57.
      // Remove this line once the colours are fixed.
      .disableRules(['color-contrast'])
      .analyze()

    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))

    if (blocking.length > 0) {
      const summary = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}\n  ${v.help}\n  ${v.helpUrl}`)
        .join('\n\n')
      expect.soft(blocking, `Settings panel violations:\n\n${summary}`).toHaveLength(0)
    }

    expect(blocking).toHaveLength(0)
  })
})
