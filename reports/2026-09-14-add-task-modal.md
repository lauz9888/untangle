```metrics
tracking_issue: 112
started_at: 2026-09-14T17:18:53Z
completed_at: 2026-09-14T20:07:13Z
total_hours: 2.81
coverage_percent: 98.89
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 7
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 2
  ci: 1
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 3
```

# Add Task modal

**Branch:** `feature/add-task-modal` · **PR:** [#122](https://github.com/lauz9888/untangle/pull/122) (squash-merged) · **Tracking issue:** [#112](https://github.com/lauz9888/untangle/issues/112) · **Deployed:** 2026-09-14

## Requirements

Add a plus-sign trigger button next to the "Untangle" logo/title in the header that opens an "Add Task" modal, UI-only (no task CRUD/persistence wiring — deferred to future work). The modal contains:

- **Task name** (text, required — the only field that blocks Save).
- **Now/Next/Later** — a required single-select (pre-selected to "Now," cannot be cleared, reuses `NowNextLaterBoard.vue`'s three labels but not its data/model), which never blocks Save.
- **Description** (text, optional).
- **Energy level** — optional Low/Medium/High single-select, reusing `useEnergyLevel.ts`'s type/labels.
- **Estimate** — Days/Hours/Minutes, each an independently optional/zero-able non-negative integer.
- **Available from** / **Due by** — optional date pickers; when both are set, Due by must be on/after Available from (blocks Save otherwise).
- **Sub-tasks** — its own plus button opens an inline draft text field with Save/Close actions; saved sub-tasks list in insertion order with a per-item delete "X".

Closing (X, Escape, or backdrop) while any field has a value shows a "Close without saving?" confirmation (Yes discards and closes both dialogs; No returns to the modal with values intact); closing with nothing entered closes immediately. Save closes the modal without persisting anything, so long as Task name is non-empty and the date-order constraint is satisfied. 41 requirements total, including 6 explicit accessibility requirements (WCAG 2.1 A/AA baseline, matching `.claude/STANDARDS.md`'s scan scope) covering roles/names/states, full keyboard operability, visible focus indicators, focus management across the whole open/close flow, AA contrast, and accessible validation announcements.

Approved 2026-09-14 (full text: `.workflow/add-task-modal/requirements.md`).

## Solution

A header trigger (`AddTaskButton.vue`) opens `AddTaskModal.vue`, which nests a `CloseConfirmDialog.vue`. All state (open/closed, every field, validation, sub-tasks) lives in a new **singleton** composable, `useAddTaskModal.ts`, following `useEnergyLevel.ts`'s precedent (trigger and modal are unrelated siblings in `App.vue`'s tree). No task persistence is introduced anywhere — Save simply closes the modal.

- **Custom overlay dialogs, not native `<dialog>`** (`docs/adr/0002-custom-overlay-dialog-for-add-task-modal.md`): the pinned `jsdom@^25.0.1` unit-test environment doesn't implement `HTMLDialogElement.showModal()`/`.close()`. A hand-rolled focus trap (`useFocusTrap.ts`, new non-singleton per-instance factory) cycles Tab/Shift+Tab within whichever dialog is open.
- **Background content hiding**: since a custom overlay lacks the browser's native top-layer isolation, `App.vue` wraps everything except `AddTaskModal` in an `.app-background` element toggled `inert`/`aria-hidden="true"` while the modal is open — defense in depth beyond `aria-modal`/the Tab-trap alone.
- **Initial-open focus lives in `onMounted()`, not a `watch()`**: `AddTaskModal`/`CloseConfirmDialog` are each `v-if`-gated on their own open flag, so they only ever mount once that flag is already `true` — a non-`immediate` watch registered in `setup()` can never observe an already-happened transition.
- **Estimate sanitization**: the three Estimate sub-fields are controlled inputs (`:value`/`@input`, not bare `v-model`) routed through `setEstimateField()`, which strips every non-digit character on every keystroke so the underlying refs can never hold a negative or non-integer value.
- No new runtime dependencies. Native `<input type="date">` for the two date fields, consistent with the existing hand-written-SVG/no-icon-library approach.

**Design amendments mid-pipeline (post-manual-test, issues #120/#121):** the Estimate field's three-line stacked layout was replaced with a single compact, non-wrapping row (shortened "Days"/"Hrs"/"Min" labels) to fix scrolling caused by the field's original vertical footprint; and `setEstimateField()` gained a `clampToMax()` step applied on every keystroke so Hours can never exceed 23 and Minutes can never exceed 59 (Days stays uncapped), plus advisory `max` HTML attributes.

No PWA/deployment impact (no new routes, assets, manifest, or base-path interaction). Full design detail: `.workflow/add-task-modal/design.md`.

## Test changes

- **`tests/unit/add-task-modal/composable.test.ts`** — `useAddTaskModal.ts` behavior with a fresh singleton per test (`vi.resetModules()`): default state, open/reset, every close-confirmation trigger condition (Req 24, including the "0 counts as blank" rule), Estimate sanitization (non-negative/integer stripping) and upper-bound clamping (Hours ≤23, Minutes ≤59, Days uncapped, including keystroke-by-keystroke and boundary cases), Save validation (Task name required, due-date ordering), sub-task add/delete/draft-discard-then-reopen, and singleton state sharing. No automated WCAG scan (pure composable logic, nothing rendered).
- **`tests/unit/add-task-modal/components.test.ts`** — mocks `useAddTaskModal` (and `useSectionCollapse`/`useEnergyLevel` for the `App`-mounting block) to isolate rendering: roles/names/states for every field, the sub-task draft's accessible-name disambiguation, the nested-dialog Escape/Tab double-handling guard (mounting the real, un-stubbed `CloseConfirmDialog`), Estimate input wiring and `max` attributes, and `.app-background`'s `inert`/`aria-hidden` wiring. **Includes `jest-axe` scans** (WCAG tags per `.claude/STANDARDS.md`, `color-contrast` disabled) across 7 distinct DOM states: trigger button alone, modal default open, sub-task input open, sub-tasks populated, Task name error shown, Due by error shown, and confirm dialog open.
- **`tests/unit/focus-trap/composable.test.ts`** — the new `useFocusTrap.ts` DOM utility: Tab/Shift+Tab wrap-around among a container's focusable elements, non-Tab keys ignored, zero-focusable-element edge case. No paired `components.test.ts` (pure DOM utility, no associated component). No automated WCAG scan.
- **`features/add-task-modal.feature`** + **`features/step_definitions/add-task-modal.steps.ts`** + **`features/support/world.ts`** + **`features/step_definitions/energy.steps.ts`** — BDD scenarios driving the real composable: fresh-session defaults, Now/Next/Later default/change behavior, every close-confirmation trigger condition, Estimate sanitization and clamping (including boundary values), Yes/No confirmation outcomes, Save validation, and sub-task add/delete/draft-discard-then-reopen. No automated WCAG scan (Cucumber steps, no rendered browser DOM).
- **`tests/e2e/add-task-modal.spec.ts`** + **`tests/e2e/helpers.ts`** — real-browser coverage of the trigger→open flow and initial focus, focus-trap wrap-around, Escape/X/backdrop close paths with the confirmation dialog, the nested-dialog Escape double-handling guard in a real browser, the background-inert check, Save validation and due-date ordering, sub-task add/delete, real `<input type="number">` filtering/clamping behavior for Estimate, and the Estimate row's single-line/non-wrapping layout with 44px tap targets.
- **`tests/e2e/mobile-responsive.spec.ts`** — extended with the Add Task modal's 375×812 mobile layout and 44×44px control checks (Req 35), including the Estimate row.
- **`tests/e2e/a11y.spec.ts`** — extended with **`@axe-core/playwright` scans** of the modal open (default state) and confirmation dialog open, plus a mobile-viewport (375×812) modal-open case; this is the layer that exercises real `color-contrast` computation (Req 40), which `jest-axe` cannot check under jsdom.

Per `state.md`, all three layers' scoped (Steps 5-7) and full (Steps 9-11) suites, plus the `GITHUB_PAGES=true` base-path smoke check (Step 13, a no-op here per `design.md` since this change has no base-path implication), passed green ahead of merge. Combined coverage: **98.89%**.

## Accessibility

Coverage per UI-facing requirement (from `design.md`'s requirement coverage map):

| Req | Coverage (design decision) | Automated scan |
| --- | --- | --- |
| 1-4 (trigger button) | `aria-label="Add task"`, decorative glyph `aria-hidden`, native `type="button"` (Enter/Space free), 44px mobile tap target | jest-axe (button alone), e2e mobile-responsive |
| 5 (modal dialog semantics) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → visible `<h2>Add Task</h2>` | jest-axe (modal open), e2e a11y |
| 6 (initial focus) | `onMounted()` moves focus to Task name (not a `watch`, per #117) | e2e (real focus assertion) |
| 7 / 7a (focus trap + background hiding) | `useFocusTrap.ts` Tab-cycles within the dialog; `.app-background` toggled `inert`/`aria-hidden` while the modal is open (#119) | unit (focus-trap composable, `.app-background` attrs), e2e (real-browser `inert` + Tab-sequence check) |
| 8 (Close/X) | `aria-label="Close"`, decorative glyph `aria-hidden`, same pattern as `CollapsibleSection.vue` | jest-axe, e2e |
| 9 (Escape) | `@keydown.esc="requestClose"`, no-ops while the confirm dialog is open (#116) | unit (double-handling guard test), e2e (real-browser guard check) |
| 10 (focus return, no-confirm close) | `AddTaskButton.vue` watches `isOpen`, refocuses itself on `true → false` | unit, e2e |
| 11-23 (field labels/groups/sub-task list) | Explicit `<label for>` on every text/date/estimate field; `role="group"` + `aria-pressed` for Now/Next/Later and Energy level; sub-task draft input given its own `<label for="sub-task-draft">` (closing the gap found in #115); delete buttons named `"Delete sub-task: {text}"` | jest-axe (each populated/open DOM state), unit label-association assertions |
| 24-29 (close confirmation) | `role="alertdialog"`, `aria-modal`, `aria-labelledby`; own focus trap; `@keydown.stop` at its root so it doesn't double-handle Escape/Tab with the parent modal (#116); No/Escape returns focus to the X button, Yes returns focus to the trigger | jest-axe (confirm dialog open), e2e (real-browser Yes/No focus-return + double-handling checks) |
| 30-34 (Save) | Native `<button>`; failed Save (empty Task name) shows `role="alert"` message + `aria-describedby` + moves focus to Task name; successful Save never blocks on Now/Next/Later (always has a value) | unit, e2e |
| 35 (responsive) | `@media (max-width: 640px)` on both dialogs; every interactive control (Save, Close, both plus buttons, Now/Next/Later, each delete X, Yes, No, Estimate inputs) gets a 44×44px minimum tap target | e2e mobile-responsive |
| 36-39 (roles/names/keyboard/focus mgmt) | See rows above; summarized end-to-end in `design.md`'s Accessibility section — no point in the open/close flow leaves focus on `<body>` or a removed element | jest-axe, e2e |
| 40 (AA contrast) | No new colors — reuses the already-audited palette (`#1a1a1a`/`#767676`/`#595959`/`#fff`/`#d6d6d6`) | e2e a11y (`@axe-core/playwright`, `color-contrast` enabled — jest-axe can't evaluate this under jsdom) |
| 41 (validation announcements) | Both `task-name-error` and `task-due-by-error` use `role="alert"` **and** `aria-describedby` | jest-axe, unit |

Issues carrying the `accessibility` label:

- **[#115](https://github.com/lauz9888/untangle/issues/115)** (`design`, `accessibility`) — the sub-task inline draft input had no specified accessible name. **Resolution**: added an explicit `<label for="sub-task-draft">New sub-task</label>`, matching every other new text input in this design; the draft's "Close" button's accessible name was also disambiguated to `"Close sub-task text"` (via a visually-hidden suffix, visible text unchanged) so it doesn't collide with the modal's own X button's plain `"Close"` name. Closed 2026-09-14, 18:03.
- **[#116](https://github.com/lauz9888/untangle/issues/116)** (`design`, `accessibility`) — no test existed for the nested-dialog Escape/Tab double-handling guard (confirm dialog on top of the Add Task modal). **Resolution**: design added an explicit unit test mounting the real, un-stubbed `CloseConfirmDialog` to prove Escape/Tab dispatched inside it never also triggers `AddTaskModal`'s own handlers, plus a matching real-browser e2e case. Closed 2026-09-14, 18:03.
- **[#119](https://github.com/lauz9888/untangle/issues/119)** (`design`, `accessibility`) — no `inert`/`aria-hidden` treatment of background content while a dialog is open. **Resolution**: `App.vue` wraps everything in `<main>` except `AddTaskModal` in a new `.app-background` element, toggled `inert`/`aria-hidden="true"` while `useAddTaskModal().isOpen` is true — defense in depth since the custom overlay doesn't get native top-layer isolation. Closed 2026-09-14, 18:12.

## Bugs raised

All 10 bug issues opened during this run were closed before/during the pipeline; none reached CD as a live-user-facing defect.

**`design`** (7 issues — caught during the solution-design review loop, Step 3, before any code was written; 4 review cycles):

| # | Opened → Closed (UTC) | Summary | Resolution |
| --- | --- | --- | --- |
| [#113](https://github.com/lauz9888/untangle/issues/113) | 17:45 → 17:52 | Estimate sub-fields didn't enforce a non-negative/integer constraint | Added `sanitizeDigitsOnly()`, applied on every keystroke via controlled `:value`/`@input` inputs |
| [#114](https://github.com/lauz9888/untangle/issues/114) | 17:45 → 17:52 | Ambiguous which unit test file owns the new `App` describe block | Design specifies `tests/unit/add-task-modal/components.test.ts` gets its own self-contained `App` block, matching the `energy-level`/`now-next-later` precedent |
| [#115](https://github.com/lauz9888/untangle/issues/115) | 17:52 → 18:03 | Sub-task inline draft input had no specified accessible name | See Accessibility section above |
| [#116](https://github.com/lauz9888/untangle/issues/116) | 17:52 → 18:03 | No test for the nested-dialog Escape/Tab double-handling guard | See Accessibility section above |
| [#117](https://github.com/lauz9888/untangle/issues/117) | 18:03 → 18:12 | `v-if`-mounted watchers for `isOpen`/`isConfirmOpen` wouldn't fire on initial focus | Moved initial-focus logic from `watch()` to each component's own `onMounted()` hook |
| [#118](https://github.com/lauz9888/untangle/issues/118) | 18:03 → 18:12 | `closeSubTaskInput()` didn't specify clearing `subTaskDraft` | Specified `closeSubTaskInput()` resets both `isSubTaskInputOpen` and `subTaskDraft` in the same call |
| [#119](https://github.com/lauz9888/untangle/issues/119) | 18:03 → 18:12 | No `inert`/`aria-hidden` treatment of background content while a dialog is open | See Accessibility section above |

**`manual-test`** (2 issues — found during the manual-test gate, Step 14, after implementation; each routed back through `solution-designer` for a fresh design→review→implement cycle):

| # | Opened → Closed (UTC) | Summary | Resolution |
| --- | --- | --- | --- |
| [#120](https://github.com/lauz9888/untangle/issues/120) | 19:17 → 19:26 | Estimate field's three-line stacked layout pushed later fields below the fold, requiring scrolling | Replaced with a single compact, non-wrapping row (shortened "Days"/"Hrs"/"Min" labels, `flex-wrap: nowrap`, narrowed input widths); underlying sanitizer/validation logic unchanged |
| [#121](https://github.com/lauz9888/untangle/issues/121) | 19:36 → 19:42 | Estimate Hours/Minutes had no upper bound (e.g. "99" hours, "999" minutes accepted) | Added `clampToMax()` inside `setEstimateField()`, applied on every keystroke, capping Hours at 23 and Minutes at 59 (Days stays uncapped), plus advisory `max` HTML attributes |

**`ci`** (1 issue — pre-merge, PR #122, Step 18):

| # | Opened → Closed (UTC) | Summary | Resolution |
| --- | --- | --- | --- |
| [#123](https://github.com/lauz9888/untangle/issues/123) | 19:56 → 20:01 | Format check job failed on the feature branch | Prettier formatting fix, re-pushed, all required CI jobs green |

No `requirement`, `unit-test`, `bdd-test`, `e2e-test`, `qa`, `deploy-path`, or `cd`-labeled issues were raised this run — all unit/BDD/e2e suites passed green through the standard Steps 9-11 loop, QA review (Step 12) found no further gaps, and CD (build, deploy, PWA validation, live e2e, post-deploy smoke check) was green.

## Coverage

Combined statement coverage across unit + BDD + e2e: **98.89%** (`state.md`'s `coverage-percent`), above the `.claude/STANDARDS.md` threshold.

## Outcome

**Deployed.** Merge SHA `7c4c58429c355c8bc28fa02bdc23eb606e19d22f` built and published successfully to GitHub Pages (CD run [34890438895](https://github.com/lauz9888/untangle/actions/runs/34890438895)); post-deploy smoke check, PWA validation, and live e2e all passed. This change is live.

## Time taken

Wall-clock time from requirements analysis start to report completion: **~2 hours 48 minutes** (2026-09-14T17:18:53Z → 2026-09-14T20:07:13Z, ~2.81 hours).

This spans human wait time as well as active engineering time — it includes the requirements-approval gate (Step 2) and the manual-test sign-off gate (Step 14, which itself surfaced issues #120/#121 and their full design→review→implement cycles), plus CI/CD wait time, not purely implementation effort. Most of the elapsed time reflects the four design-review cycles (issues #113-119, ~17:45-18:12) and the two manual-test-triggered design amendments (#120, #121, ~19:17-19:43) rather than raw coding time.
