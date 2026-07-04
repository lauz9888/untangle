# Optimise Untangle for mobile usage

**Branch:** `feat/mobile-optimisation` · **PR:** [#93](https://github.com/lauz9888/untangle/pull/93) · **Merged:** 2026-07-04

## Requirement

At viewport widths <=640px, the header (logo/tagline, energy-level panel, Encourage me button) switches from its single-row layout to a vertical stack (logo/tagline on top, energy panel and Encourage me button below, full width) so nothing overflows or crowds on phone screens. At these widths, interactive controls (energy-level buttons, Encourage me button, toast close button) get a minimum ~44px tap target. The toast notification stays fully on-screen with adequate side margins. Above 640px, the existing desktop layout is unchanged.

Scope questions (header stacking behavior, breakpoint, whether to include tap targets) were resolved with the user up front rather than assumed.

## Solution

CSS-only change — no new composables, components, or dependencies. A single `@media (max-width: 640px)` block was added to each affected component's existing scoped `<style>`:

- `App.vue`: `.brand` switches from `position: absolute` to `position: static` with `flex-direction: column` (so the header can grow taller when stacked without clipping or overlapping later content); `.header-actions` goes full-width with `flex-wrap: wrap` as a safety net at very narrow widths.
- `EnergySelector.vue` / `EncourageButton.vue`: buttons get `min-height: 44px` (and `min-width` for the energy pills).
- `ToastNotification.vue`: `.toast` gets an explicit `width` (instead of just `max-width`) so it can't overflow the viewport, plus `box-sizing: border-box` and `justify-content: space-between` (both added during the bug fixes below); `.toast-close` gets a 44px tap target.

Desktop styles were left untouched — the media query is purely additive.

## Bugs raised and resolved

| #                                                     | Category | Detected by      | Summary                                                                                               | Resolution                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | -------- | ---------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#91](https://github.com/lauz9888/untangle/issues/91) | `manual` | `manual-testing` | Toast rendered flush against both screen edges with no visible margin at mobile widths                | `.toast` used the default `box-sizing: content-box`, so its own padding was added on top of `width: calc(100% - 2rem)`, cancelling the intended margin. Added `box-sizing: border-box`. Also tightened the e2e assertion, which had only checked "doesn't overflow" (trivially true at zero margin).                                            |
| [#92](https://github.com/lauz9888/untangle/issues/92) | `manual` | `manual-testing` | User-reported: toast close button floated with a large empty gap instead of sitting at the right edge | `.toast` had no `justify-content`, invisible on desktop (shrink-to-fit box) but exposed once mobile forced an explicit, wider `width`. Added `justify-content: space-between`. Replaced the geometry-based e2e check (flaky — passed or failed depending on the random message's length) with a direct assertion on computed `justify-content`. |

Both bugs were specific to the toast's flex layout interacting with the new explicit mobile `width` — neither was visible on the existing desktop layout, which is why they only surfaced once this change added width constraints.

## Time taken

Wall-clock time from requirement analysis to merge: **~41 minutes** (11:58:44 → 12:39:49 UTC).

This spans human wait time as well as engineering time — it is not a measure of pure implementation effort. Roughly:

- **Human response time** (~2 min): confirming the 3 scope-clarifying questions up front, reviewing the browser preview and reporting the toast spacing issue (#92), and confirming the final merge.
- **CI wait time** (~1 min): one CI run against GitHub Actions' 9 required jobs, all green first try.
- **Active engineering time** (~38 min): design, TDD unit tests (determined none applied — CSS-only, jsdom can't evaluate media queries), implementation, refactor, TDD e2e tests, real e2e execution, a self-caught bug (#91) found via careful manual verification in the browser preview before ever handing off to the user, the user-reported loop-back and fix (#92), branch deploy, and the wiki update.

Note: a meaningful chunk of the active engineering time went into precisely diagnosing #91 and #92 via direct DOM measurement (`getBoundingClientRect`/`getComputedStyle`) rather than trusting screenshots alone — both bugs were subtle CSS interactions (content-box padding, missing flex `justify-content`) that were easy to misdiagnose from a screenshot but showed up unambiguously in the numbers.
