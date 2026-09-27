```metrics
tracking_issue: 135
started_at: 2026-09-27T17:57:20Z
completed_at: 2026-09-27T22:54:49Z
total_hours: 4.96
coverage_percent: 96.08
storybook_story_count: 23
storybook_interaction_test_count: 12
storybook_a11y_pass_rate: 23/23 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 5
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  storybook-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 1
  ci: 0
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

# Storybook for UI component testing

Tracking issue: #135 · PR: #142 · Branch: `feature/storybook` (merged) · Housekeeping branch: `docs/storybook`

## Requirements

Add Storybook as a fourth, peer test layer alongside the existing unit/BDD/e2e layers, scoped to
this repo's 9 presentational components (`EnergySelector`, `EncourageButton`, `ToughLoveButton`,
`ToastNotification`, `CollapsibleSection`, `AddTaskButton`, `NowNextLaterBoard`, `AddTaskModal`,
`CloseConfirmDialog`). In scope: a `.stories.ts` file per component covering every "meaningfully
distinct state" already enumerated in that component's `components.test.ts`; a `play`-function
interaction test reproducing every single-action/single-assertion interaction case from the same
file; an automated WCAG a11y scan (same tag scope as `.claude/STANDARDS.md`) on every story; a
headless CI-runnable mode folded into `scripts/merge-coverage.mjs` as a fourth coverage source
gated at the existing 90% threshold; a conservative, individually-justified trim of any unit/BDD/e2e
coverage genuinely duplicated by the new layer (no behavior may lose its only remaining test); and
matching updates to `.claude/skills/ship-feature/SKILL.md`/`.claude/agents/*.md` so Storybook is
authored, run, reviewed, and reported on the same way as the other three layers at every relevant
pipeline stage. Explicitly out of scope: visual regression/pixel-diff tooling, publishing/deploying
the built Storybook anywhere, any change to component markup/behavior, and any new `dependencies`
(devDependency-only). Approved by the user on 2026-09-27.

## Solution

`@storybook/addon-vitest` (Storybook 9.x, `@storybook/vue3-vite` builder) runs every story as a
real Vitest test in Vitest browser mode via the Playwright provider, reusing this repo's existing
pinned `@playwright/test` Chromium binary rather than a second browser install. This choice (over
the classic `@storybook/test-runner`) was made specifically because it produces `@vitest/coverage-v8`
output using the same provider as the unit layer, letting `scripts/merge-coverage.mjs` fold it in
as a fourth `layers` entry with no bespoke coverage bridge — recorded in
`docs/adr/0004-storybook-addon-vitest-as-fourth-test-layer.md`. Stories are co-located
(`src/components/Component.stories.ts`, not a mirrored `tests/storybook/` tree) since a story has
no `composable.test.ts` counterpart to pair with. New `npm run storybook` (interactive dev,
port 6006), `npm run build-storybook`, and `npm run test:storybook` (`vitest run --config
vitest.storybook.config.ts`) scripts were added; `test:storybook` is also wired into a new required
`storybook-tests` CI job. Pipeline-wise, `unit-test-author` was extended (rather than adding a new
agent) to author stories alongside `components.test.ts` — it already owns the identical
mocked-composable surface the trim operates on — and a new non-renumbering **Step 11a** (full
Storybook suite + bug-fix loop) was inserted after Step 11, mirroring the existing Step 21a
precedent. `qa-reviewer`, `implementer`, `solution-reviewer`, and `report-generator` were all
updated to treat Storybook as a fourth peer layer (four-layer coverage gate, four file lists,
four-way testability review, `storybook-test` stage label and metrics keys respectively).

During solution review, 5 design gaps were caught and fixed before implementation began (see "Bugs
raised" below): missing Step 11a re-run wiring on the QA gap-routing paths, no concrete
follow-through action for the branch-protection-required-check risk, a missing `storybook-test`
bucket in `report-generator`'s own stage-label enumeration, a miscounted section header, and a
trim-rule description narrower than what was actually applied. All five were resolved in the
design before Step 4 (branch creation).

## Test changes

**Storybook (new layer) — 23 stories across 9 files, 12 with a `play`-function interaction test,
every story scanned by `@storybook/addon-a11y` (WCAG `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`, same
scope as `.claude/STANDARDS.md`, color-contrast left enabled since this runs in real headless
Chromium, not jsdom):**

- `src/components/EnergySelector.stories.ts` — 5 stories: `Unselected`, `LowSelected`,
  `MediumSelected`, `HighSelected`, and `Interactions` (clicks Low/Medium/High, asserts
  `selectLevel` called with each value). Addon-a11y scan on all 5.
- `src/components/EncourageButton.stories.ts` — 1 story: `Default` (click → `encourageMe()`
  called). Addon-a11y scan.
- `src/components/ToughLoveButton.stories.ts` — 1 story: `Default` (click → `toughLove()` called).
  Addon-a11y scan.
- `src/components/ToastNotification.stories.ts` — 2 stories: `Hidden`, `Visible` (close-button
  click → `dismissToast()` called). Addon-a11y scan on both.
- `src/components/CollapsibleSection.stories.ts` — 3 stories: `Expanded`, `Collapsed`, and a
  toggle-click interaction asserting the `toggle` emit fires. Addon-a11y scan on all 3.
- `src/components/AddTaskButton.stories.ts` — 1 story: `Default` (click → `openModal()` called).
  Addon-a11y scan.
- `src/components/NowNextLaterBoard.stories.ts` — 4 stories: `EmptySections`, `OneIncompleteTask`
  (checkbox click → `toggleTaskDone(id)` called), `OneCompletedTask`, `MixedCollapsedExpanded`
  (resizes to 375×812, clicks each of the Now/Next/Later toggle buttons → `toggle('now'|'next'|
'later')` called, 3 assertions in one `play`). Addon-a11y scan on all 4.
- `src/components/AddTaskModal.stories.ts` — 5 stories: `Open` (a single `play` reproducing 8
  distinct interactions: content-click no-op, backdrop-click/X-click/Escape all calling
  `requestClose`, Now/Next/Later selection, energy-level selection, all 3 estimate fields, Save),
  `SubTaskInputOpen` (open/save/close sub-task-draft wiring), `PopulatedSubTasks` (delete-sub-task
  wiring), `TaskNameError`, `DueByError` (distinct DOM states, no new interaction, added for a11y
  scan parity with the removed unit `jest-axe` states). Addon-a11y scan on all 5.
- `src/components/CloseConfirmDialog.stories.ts` — 1 story: `Open` (Yes/No/Escape wiring to
  `confirmDiscard()`/`cancelDiscard()`). Addon-a11y scan.

**Unit — 14 cases trimmed, each an exact duplicate of a new `play`-function assertion, no
`jest-axe` case touched:**

- `tests/unit/energy-level/components.test.ts` (−4): `EnergySelector`'s click-wiring case,
  `EncourageButton`'s and `ToughLoveButton`'s click-wiring cases, `ToastNotification`'s
  close-button-wiring case — all replaced 1:1 by the matching story above. Kept unchanged: every
  static-rendering assertion, the real-timer auto-dismiss `describe` block, every `jest-axe` case.
- `tests/unit/now-next-later/components.test.ts` (−3, one an `it.each` covering 3 sub-cases):
  the Now/Next/Later toggle-click `it.each`, the task-checkbox `toggleTaskDone` case, and
  `CollapsibleSection`'s toggle-emit case — replaced by `NowNextLaterBoard.stories.ts`'s
  `MixedCollapsedExpanded`/`OneIncompleteTask` and `CollapsibleSection.stories.ts`. Kept unchanged:
  all rendering/sorting/section-membership cases and every `jest-axe` case.
- `tests/unit/add-task-modal/components.test.ts` (−7): `AddTaskButton`'s click-wiring case, the
  sub-task-Save-button case, and all 3 `describe('close wiring')` cases (X-click, Escape,
  backdrop-vs-content-click), plus `CloseConfirmDialog`'s Yes/No case and its Escape case —
  replaced by `AddTaskButton.stories.ts`, `AddTaskModal.stories.ts`'s `Open`/`SubTaskInputOpen`
  stories, and `CloseConfirmDialog.stories.ts`. Kept unchanged (deliberately, as _mixed_
  static+interaction cases with no story equivalent): Now/Next/Later and energy-level
  reflects-selection cases, estimate-input attribute cases, sub-task insertion-order/disabled-state
  cases, Save-wiring-plus-focus-management, initial-open-focus, confirm-dialog-close-returns-focus,
  both real-nested-component `Escape/Tab double-handling guard` integration cases, every field-label
  case, every `jest-axe` case.

**BDD and e2e — zero removals**, confirmed by explicit per-file review (design §9) and by the
merge diff itself: no `features/**/*.feature` or `tests/e2e/*.spec.ts` file appears among the 35
files changed in PR #142. `features/add-task-modal.feature` (5 scenarios) and
`features/task-management.feature` (1 scenario) remain multi-step journeys with no
single-component-story equivalent; all 9 `tests/e2e/*.spec.ts` files remain real-timer,
`localStorage`, real-viewport, or full-page-composited-a11y concerns a story can't replicate.

## Accessibility

- Requirement 15 (every interactive story shows correct role/name/value, no keyboard-only gaps,
  visible focus, sufficient color contrast where the engine supports it): covered by
  `@storybook/addon-a11y`, configured in `.storybook/preview.ts` to the same WCAG tag scope as
  `.claude/STANDARDS.md`, running automatically against all 23 stories via
  `@storybook/addon-vitest`'s real headless-Chromium execution (`npm run test:storybook`) — 23/23
  stories pass, with color-contrast left enabled here (unlike jsdom-based `jest-axe`) since this is
  a real rendering engine.
- Requirement 16 (no new application-facing interactive elements): satisfied by construction — zero
  `.vue` component files were modified by this change (confirmed in design §6/§8 and the merge
  diff, which touches only `.stories.ts`, test-trim, and pipeline/tooling files).
- No issue from this run carries the `accessibility` label (`bugs_by_category.accessibility: 0`).

## Bugs raised

All 6 issues related to #135 are closed.

**design (5)** — all found during the solution-design review loop, before Step 4 (branch
creation), and resolved same-day in an updated design:

- **#136** — opened 2026-09-27T18:22:07Z, closed 18:28:48Z. Step 12's coverage/a11y-gap routing
  said "re-run Steps 9–11" but omitted the new Step 11a, so a Storybook-layer finding would fix
  the story but never re-run `test:storybook` before re-spawning `qa-reviewer`. Resolved in
  updated design.
- **#137** — opened 18:22:10Z, closed 18:28:51Z. Requirement 7 wants a broken story to block merge
  like unit/BDD/e2e, but doing so needs a GitHub branch-protection change outside the orchestrator's
  authority; design lacked a concrete follow-through action. Resolved in updated design (added a
  one-time `AskUserQuestion` at Step 15).
- **#138** — opened 18:22:11Z, closed 18:28:53Z. `report-generator.md`'s own stage-label
  enumeration (separate from SKILL.md's bug-tracking label list) was missing a `storybook-test`
  bucket. Resolved in updated design.
- **#139** — opened 18:27:08Z, closed 18:28:56Z. Design §8's section header said "remove 3 cases"
  for the add-task-modal trim but the table below listed 7 (matching the stated 4+3+7=14 total).
  Resolved in updated design (header corrected to "remove 7 cases").
- **#140** — opened 18:27:09Z, closed 18:28:59Z. Design §8's stated conservative trim rule
  (single-action/single-assertion only) didn't literally cover 2 of the listed removals (both
  2-action/2-assertion bounded sequences). Resolved in updated design (rule text broadened to match
  what was actually applied).

**manual-test (1)**:

- **#141** — opened 2026-09-27T19:50:26Z, closed 21:50:01Z. Every story crashed in the interactive
  `npm run storybook` dev server (`Cannot read properties of undefined (reading
'customEqualityTesters')`) because Storybook's plain dev-server Vite pipeline never initializes
  Vitest's `expect`/matcher globals the way `test:storybook`'s real Vitest browser-mode run does.
  Fixed by aliasing the `vitest`/`vitest-browser` imports to interactive-safe stubs in the
  `storybook dev`/`build` Vite config path only, gated on `process.env.VITEST`, so
  `addon-vitest`'s real Vitest browser-mode run is unaffected. All 9 stories verified rendering
  correctly in the interactive dev server after the fix.

## Coverage

Combined coverage (unit + BDD + e2e + Storybook, `npm run test:coverage:merge`): **96.08%**,
above the 90% threshold in `.claude/STANDARDS.md`.

## Outcome

**Deployed.** Merged to `main` at `9054d2edb5a8f82a5e5a299b56163a300fc45e61` (PR #142); CD run
36356199754 completed successfully and the change is live.

## Time taken

Started 2026-09-27T17:57:20Z, completed 2026-09-27T22:54:49Z — **4.96 hours** total elapsed. This
figure spans human wait time (the requirements and manual-test human gates, solution-review
turnaround, and CI/CD watch time), not just active engineering time, and should not be read as a
pure implementation-effort estimate.
