```metrics
tracking_issue: 165
started_at: 2026-10-13T13:39:59Z
completed_at: 2026-10-13T21:02:00Z
total_hours: 7.4
coverage_percent: 98.14
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 48/48 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 6
  unit-test: 1
  bdd-test: 0
  e2e-test: 1
  storybook-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 1
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

# mobile-header-actions-one-row

Tracking issue #165. Feature PR #174 (squash-merged as 187a9bd, previous main 85180c4). Branch `feature/mobile-header-actions-one-row`.

## Requirements

Request: on mobile, "Encourage me" and "Tough love" shared a line and "Completed" wrapped below; size the three buttons to fit on one row.

- Req 1-6: at 320-640px the three buttons share one row (same top offset within 1px) at widths 320/360/375/390/640 and Completed counts 0/9/99/999. No overflow or horizontal scroll, min 44px height and width, labels fully visible and unchanged.
- Req 7-11: size reductions only inside the `@media (max-width: 640px)` blocks. DOM and visual order unchanged. The `EnergySelector` is unchanged. Completed button behavior and focus return unchanged. Toast, celebration positioning and board still work.
- Req 12-17 (WCAG 2.1 AA): native buttons with accessible names equal to visible labels, keyboard operable, visible unclipped focus indicator, contrast kept, font at least 12px, reflow at 320px, no new axe violations.
- Req 18-21 were added after the Step 14 manual test found a pre-existing 15px header/board overlap at 650-900px (since the task-completion change). The user chose to include the fix, which reopened the Step 2 gate. The board must clear the header and every header control at 641-1280px, adapt to the header's real height, and keep the toast and celebration from overlapping header controls. The user clarified Req 20 and 21 wording.

## Solution

- `src/App.vue`: the three buttons are wrapped in `.header-buttons`. It is `display: contents` above 640px, so desktop is unchanged. At 640px and below it is a no-wrap flex row that bleeds 1rem into the brand padding on each side, because 256px of content width could not fit "Completed (999)" otherwise.
- The three button components get compact sizing inside their media blocks only (12px font, 0.3rem inline padding, 0.25rem gap, `min-width: 44px`, `white-space: nowrap`, `flex: 1 1 auto`). `EncourageButton.vue` and `ToughLoveButton.vue` also get a media-scoped `:focus-visible` outline (2px #1a1a1a), which they lacked.
- Amendment 1 (Req 18-21): `.brand` above 640px moves from `position: absolute` back into normal flow. Compensating `margin: -8px -8px 0` and `padding: 1.5rem 1.5rem 0` keep its pixel position and wrap threshold identical. `NowNextLaterBoard.vue`'s fixed `margin-top: 6rem` is replaced by a small gap, so clearance follows the header's rendered height. The mobile `.brand` block gained `margin: 0`.
- No composable, store or behavior change, no new dependency, and no ADR.

## Test changes

- Unit (Vitest + jest-axe): `tests/unit/completed-panel/components.test.ts` adds a jest-axe case for the Completed button with a 3-digit count. Final run: 427 unit tests passing. Issue #169 fixed the header child-order assertion.
- BDD: no changes. `features/` has no header or mobile scenarios. 14/14 scenarios pass.
- E2E (Playwright):
  - `tests/e2e/mobile-header-actions.spec.ts` (new): width and count matrix for one-row alignment, order, bounds, 44px targets, unclipped labels, font size, keyboard and focus rings, toast and header non-overlap, 641px desktop boundary.
  - `tests/e2e/header-board-clearance.spec.ts` (new): board clearance at 641-1280px across counts and energy selection, single-line tolerance, 640/641 boundary, header position pins (in-page A/B baseline after #175).
  - `tests/e2e/a11y.spec.ts`: `@axe-core/playwright` scans at 320x812 and at 700x900, both with 999 completed tasks, with color-contrast enabled.
  - `tests/e2e/task-completion.spec.ts`: extended viewport list for "celebration card never covers header controls".
  - Final run: 176/176 e2e.
- Storybook (`@storybook/addon-a11y` scans every story): `EncourageButton.stories.ts` and `ToughLoveButton.stories.ts` gain focus-outline play tests at a mobile viewport. `CompletedButton.stories.ts` gains a `LargeCount` (999) story. Final run: 48/48 stories pass, including the a11y scan. 35 stories have a `play` function.

## Accessibility

- Req 12 and 13: native `<button type="button">` elements with unchanged labels and DOM order. Covered by the e2e accessible-name and Tab-order checks.
- Req 14: media-scoped 2px #1a1a1a focus outline, about 17:1 contrast. Covered by the Storybook play tests and the e2e focus assertions at 320px. The outline is not clipped, because the row keeps 16px viewport clearance.
- Req 15: colors untouched, font at the 12px floor.
- Req 16: single row at 320px with no horizontal scroll, asserted via `scrollWidth <= clientWidth`.
- Req 17: jest-axe, Storybook addon-a11y and the two e2e axe scans (320px and 700px) show no violations.
- Req 18-21: no semantic, keyboard or focus change. The in-flow header improves reflow because it can no longer overlap content.
- Issues with the `accessibility` label: none.

## Bugs raised

All closed (9 issues).

design (found at Step 3 review):

- #166 (opened 13:43Z, closed 13:45Z): starting padding, gap and bleed values overflowed 320px in the conservative width estimate, and the flex-shrink wording was wrong. Resolution: design corrected with a bleed and explicit tuning order.
- #167 (13:43Z to 13:45Z): a `:focus-visible` rule outside the media query changed the desktop focus ring. Resolution: moved inside the media block.
- #168 (13:43Z to 13:45Z): the Req 11 header-height check had no baseline. Resolution: baseline defined.
- #171 (16:12Z to 16:14Z): a static `.brand` shifted the desktop header 8px and moved the wrap threshold, violating Req 7. Resolution: compensating `-8px` margins plus a position-pin e2e.
- #172 (16:12Z to 16:14Z): the board-top arithmetic omitted the body's 8px margin. Resolution: arithmetic corrected.
- #173 (16:12Z to 16:14Z): the Req 21 celebration-vs-heading assertion could not pass. Resolution: Req 21 reworded by the user, design checks completed.

unit-test:

- #169 (13:52Z to 13:53Z): the header child-order test assumed direct children. Resolution: test updated for the new wrapper.

e2e-test:

- #170 (14:03Z to 14:17Z): full e2e suite flaky at default parallelism. It was first attributed to load from the new spec, then to flakiness already on main. The real root cause was about 10 duplicate vite dev servers (likely one per subagent session via the auto-start hook), each pegging a CPU core. The issue was corrected by comment. Not a product defect.

ci (also labeled e2e-test; counted once under `ci`, where it was caught):

- #175 (18:36Z to 20:56Z): the E2E and Combined coverage CI jobs failed because the Req 7 position pins were measured with Windows fonts and failed on Linux. Resolution: replaced with an in-page A/B baseline (commit 5a3f337).

Other notable events (not issues):

- Step 13 first rendered a blank page because `vite preview` also needs `GITHUB_PAGES=true`. SKILL.md's Step 13 does not document this. It was an orchestrator error, not a product bug.
- Two out-of-scope follow-ups were flagged as separate tasks. The energy panel is clipped 12px off-screen at 320px (pre-existing, being worked on in a separate session). The dev-server auto-start hook should be made idempotent.

## Coverage

Combined coverage (unit + BDD + e2e + Storybook): 98.14%, against the 90% threshold.

## Outcome

Live: `deployed` (CD run 38466810240, merge-sha 187a9bd). No CD-failure issue.

## Time taken

7.4 hours (13:39:59Z to 21:02:00Z on 2026-10-13). This is wall-clock time and includes human wait time (requirements approval and reopening, the manual test gates, review turnaround and CI wait), not only active engineering effort.
