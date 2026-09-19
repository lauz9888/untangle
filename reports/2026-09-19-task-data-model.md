# Post-change report: task-data-model

```metrics
tracking_issue: 128
started_at: 2026-09-19T16:25:35Z
completed_at: 2026-09-19T18:38:35Z
total_hours: 2.22
coverage_percent: 97.59
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 1
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 0
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

## Requirements

Implement a data model for tasks. Scope grew during Step 2 clarification from "data model only" to
data model + full UI wiring: a new singleton composable, `src/composables/useTasks.ts`, defines the
`Task` record (id, name, section, description, energyLevel, estimate `{days, hours, minutes}`,
availableFrom/dueBy, subTasks `{id, text, done}`, task-level `done`, createdAt/updatedAt) and CRUD
operations (`addTask`, `updateTask`, `removeTask`, `toggleTaskDone`, `toggleSubTaskDone`), persisted
to a dedicated `localStorage` key with hydration-on-load and a fallback to an empty list on malformed
data. `AddTaskModal.vue`'s existing Save button now actually persists a task via this store on
success, and `NowNextLaterBoard.vue` renders real tasks (name + a `done` toggle) grouped into their
Now/Next/Later sections, sorted oldest-first, respecting each section's existing collapse state.
Explicitly out of scope: edit/delete UI, rendering sub-tasks/description/energy/estimate/dates on the
board, sub-task done-toggle UI, energy-level filtering, non-creation-order sorting, schema
versioning/migration, and cross-tab sync.

## Solution

`useTasks.ts` follows the same module-level-singleton pattern already used by `useEnergyLevel.ts`/
`useAddTaskModal.ts` (no new ADR needed for that shape — ADR 0001 already covers singleton vs.
factory). Persisting task state to `localStorage` at all, however, is a new state-management
decision — every existing composable was in-memory-only — and is recorded in
`docs/adr/0003-localstorage-persistence-for-task-store.md` (localStorage vs. IndexedDB vs. no
persistence; single-key whole-array JSON shape; explicit non-goals of schema migration and
cross-tab sync). A `getStorage()` guard makes the module safe to import under the BDD layer's plain
Node runtime, which has no global `localStorage`. `AddTaskModal.vue`'s `save()` maps its field
values onto `AddTaskInput` and calls `addTask()` on successful validation only; failed validation is
unchanged from today. `CollapsibleSection.vue` gained a default `<slot />` inside `.section-content`
so `NowNextLaterBoard.vue` can inject a `<ul>`/`<li>` task list, with a native
`<input type="checkbox">` + associated `<label>` (task name) as the done-toggle, without altering the
section's existing `aria-labelledby`/collapse behavior.

## Test changes

Unit (Vitest, `jest-axe` scans scoped to the WCAG tags in `.claude/STANDARDS.md`):

- `tests/unit/tasks/composable.test.ts` — new pair member for `useTasks.ts`: CRUD/toggle behavior,
  name-trim/empty rejection, due-by-range rejection, `localStorage` persistence on every mutation,
  hydration from stored data, malformed-JSON/non-array fallback, and id-collision-after-hydration
  regression coverage.
- `tests/unit/now-next-later/components.test.ts` — updated to mock `useTasks`; covers task
  rendering, checkbox `checked` state and toggle wiring, section grouping, creation-order sort, and
  includes the automated WCAG scan (`jest-axe`) for both an incomplete-task and a completed-task DOM
  state.
- `tests/unit/add-task-modal/composable.test.ts` — updated with a `save()` → `addTask()` integration
  block covering both successful persistence and failed-validation non-persistence.

BDD (Cucumber):

- `features/task-management.feature` (new) with `features/step_definitions/task-store.steps.ts`
  (new) — CRUD/toggle scenarios plus two modal-to-store integration scenarios.
- `features/support/world.ts` / `features/step_definitions/energy.steps.ts` — updated so the shared
  `World`'s fresh-session step also clears the task store between scenarios.

E2e (Playwright, `@axe-core/playwright`):

- `tests/e2e/task-persistence.spec.ts` (new) — add-then-reload persistence, toggle-then-reload
  persistence, and corrupted-`localStorage` graceful-fallback coverage.
- `tests/e2e/now-next-later.spec.ts` — updated: per-section rendering, creation-order display,
  checkbox toggle + visual state persisting across reload, keyboard operability (Tab/Space), visible
  focus indicator, and collapsed-mobile-section visibility.
- `tests/e2e/add-task-modal.spec.ts` — updated: a successful Save shows the new task on the board;
  a failed Save (empty name) leaves the board unchanged.
- `tests/e2e/a11y.spec.ts` — updated with the automated WCAG scan (`@axe-core/playwright`) for two
  new states: an incomplete task and a completed (`done: true`) task rendered on the board, the
  latter specifically checking the muted/strikethrough completed-state color contrast that `jest-axe`
  cannot verify under jsdom.
- `tests/e2e/helpers.ts` — updated with `taskList`/`taskDoneToggle`/`taskItem` locator helpers.

## Accessibility

- Requirement 14 (task name + done-toggle rendered per task): native `<input type="checkbox">` with
  `checked` bound to `task.done`, covered by `jest-axe` (unit) and `@axe-core/playwright` (e2e).
- Requirement 15 (visual completed-state distinction, not the sole indicator): `.task-name--done`
  strikethrough + muted `#767676` text alongside the checkbox's own native checked state; contrast
  verified via the two new `@axe-core/playwright` scan states in `tests/e2e/a11y.spec.ts` (color
  contrast can't be checked in jsdom).
- Requirement 19 (unique, name-incorporating accessible name per toggle): each checkbox is paired
  with `<label for="task-{id}-done">{{ task.name }}</label>`; scanned by `jest-axe` and exercised in
  e2e via `taskDoneToggle`'s role-based locator.
- Requirement 20 (correct semantic role/value): native `<input type="checkbox">`, not a styled
  non-semantic element; covered by both automated scans.
- Requirement 21 (full keyboard operability): native checkbox behavior (Tab-focusable,
  Space-toggles); explicitly exercised in `tests/e2e/now-next-later.spec.ts`'s new keyboard test.
- Requirement 22 (visible focus indicator): relies on the browser default outline (no `outline`
  override anywhere in `src/`); explicitly exercised in `tests/e2e/now-next-later.spec.ts`'s new
  focus-indicator test.
- Requirement 23 (WCAG AA contrast in both done states): precedented colors (`#1a1a1a` default,
  `#767676` muted, both already used and scanned elsewhere in the app) plus the two new
  `@axe-core/playwright` scan states in `tests/e2e/a11y.spec.ts`.
- Requirement 24 (semantic grouping structure): `<ul class="task-list">`/`<li class="task-item">`
  nested inside `CollapsibleSection.vue`'s existing `aria-labelledby`-labeled `<section>`; scanned by
  `jest-axe` and `@axe-core/playwright`.

No issue in this run carried the `accessibility` label — the one solution-review-loop gap (#129) was
a documentation/ADR gap (`design` label), not an accessibility defect. QA (Step 12) also made a
direct, no-issue-cycle mobile tap-target fix to the done-toggle's `<=640px` sizing, consistent with
`CLAUDE.md`'s 44px minimum tap-target convention.

## Bugs raised

**design** (1):

- **#129** — "task-data-model: missing ADR for localStorage persistence approach." Opened
  2026-09-19T16:48:06Z during Step 3's solution-review loop (solution-reviewer flagged that
  `localStorage` persistence is a new state-management approach requiring an ADR per
  `docs/adr/README.md`'s trigger list, since every existing composable was in-memory-only). Closed
  2026-09-19T16:51:36Z once `solution-designer` added
  `docs/adr/0003-localstorage-persistence-for-task-store.md` and updated `design.md`'s ADR-check
  section; a fresh `solution-reviewer` pass approved the revised design.

No other issues were filed against tracking issue #128. Two e2e test-authoring mistakes were caught
and fixed directly at Step 8 without a formal GitHub issue — pure Playwright locator-semantics errors
in the test code itself (`not.toContainText` against a zero-element locator, and a `getByRole` call
blocked by the Add Task modal's pre-existing `aria-hidden` background), not a design, requirement, or
implementation defect. QA (Step 12) made two direct fixes without needing a formal bug cycle: a
typecheck fix and a mobile tap-target sizing fix.

## Coverage

97.59% combined statement coverage (unit + BDD + e2e merged), above the threshold in
`.claude/STANDARDS.md`.

## Outcome

Deployed — merged to `main` (PR #130, merge SHA `323a291b`) and confirmed live via CD run 35461505947
(`cd-outcome: deployed`).

## Time taken

Total elapsed time from requirements intake to this report: approximately 2.2 hours
(2026-09-19T16:25:35Z to 2026-09-19T18:38:35Z). This spans human wait time as well as active
engineering time — the Step 2 requirements-approval gate and the Step 14 manual-test sign-off both
depend on the user's own availability, not just implementation effort, so this figure should not be
read as a measure of pure engineering time.
