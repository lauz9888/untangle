# Change report: Fix WCAG 2 AA colour contrast on 7 UI elements

**PR**: [#69](https://github.com/lauz9888/untangle/pull/69) · **Merged**: 2026-05-18 · **Commit**: [`7e28f11`](https://github.com/lauz9888/untangle/commit/7e28f118aec6c388e4f0884c3c4bb5fefc4a1844) · **Cycle time**: 5h 40m

## What changed

Added a `--text-subtle` CSS variable (`#6b6460` light mode, `#8f8f9a` dark mode) to `src/style.css` to replace the existing pattern of applying `opacity` to `var(--text)` for muted UI text. Seven elements across `src/App.vue`, `src/components/TaskColumn.vue`, and `src/components/SettingsPanel.vue` were updated to use the new variable directly, removing their opacity declarations. The `color-contrast` axe rule exclusions were also removed from `tests/e2e/accessibility.spec.js` so the full WCAG 2 AA contrast check now runs in CI without suppression.

## Why

The opacity-based fading pattern reduced effective foreground colour contrast to as low as 1.64:1 on several elements, far below the WCAG 2 AA minimum of 4.5:1. The violations were detected by axe when the accessibility CI check was introduced in PR #52, and the CI exclusion had been left in place with a pointer to issue #57 until the colours could be fixed.

## Bug analysis

**2 bugs referenced** across this change.

| # | Title | Detected at | Status |
|---|---|---|---|
| [#57](https://github.com/lauz9888/untangle/issues/57) | Insufficient colour contrast on multiple UI elements (WCAG 2 AA) | e2e-test (PR #52) | Fixed before merge |
| [#68](https://github.com/lauz9888/untangle/issues/68) | Insufficient colour contrast in SettingsPanel — .section-title and .toggle-desc fail WCAG 2 AA | e2e-test (this change) | Fixed before merge |

**Analysis**: Issue #57 was the tracked requirement for this change — raised when the accessibility CI check landed in PR #52 — so its presence here reflects planned work rather than a surprise. Issue #68 is more instructive: the settings panel had two additional elements using the same opacity pattern that the original audit missed, found immediately when the `color-contrast` exclusion was lifted. This is the test doing exactly what it should — the constraint (disabling the rule) masked the full scope, and removing it surfaced the remaining violations in the first test run. Both fixes were CSS-only and resolved within the same session. The change sends a clean quality signal: zero implementation bugs, zero unit-test failures, and automated accessibility checking that actively expands coverage as exclusions are lifted.
