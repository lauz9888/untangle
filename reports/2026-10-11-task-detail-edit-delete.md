```metrics
tracking_issue: 144
started_at: 2026-10-11T16:51:40Z
completed_at: 2026-10-11T18:17:07Z
total_hours: 1.42
coverage_percent: 95.76
storybook_story_count: 31
storybook_interaction_test_count: 18
storybook_a11y_pass_rate: 31/31 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 1
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  storybook-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 1
  cd: 0
bugs_by_category:
  security: 1
  accessibility: 1
```

# Task detail view, edit, and delete

Tracking issue: #144 · PR: #146 (squash-merged as `7aa66b0`) · Branch: `feature/task-detail-edit-delete` (merged, deleted) · Housekeeping branch: `docs/task-detail-edit-delete`

## Requirements

Existing tasks already group correctly into Now/Next/Later on `NowNextLaterBoard.vue`, and the
store layer (`useTasks.ts`) already implements `updateTask`, `removeTask`, and
`toggleSubTaskDone` — none of them wired to any UI. This change wires them up: each rendered task
becomes a selectable affordance that opens a new editable detail view, pre-filled from the task's
current stored values (name, section, description, energy level, estimate, available-from/due-by,
sub-tasks, and `done`). Every field is editable; Save persists via `updateTask` (rejecting an
empty-after-trim name or a due-by before available-from, same store-layer rules as `AddTaskModal`);
Delete is a separate, explicitly-confirmed action calling `removeTask`. The `done` checkbox and
each sub-task's done-toggle persist **instantly** via the existing `toggleTaskDone`/
`toggleSubTaskDone` functions rather than being deferred to Save, and are excluded from the
"unsaved edits" diff that drives the view's discard-confirmation on close. Accessibility
requirements covered the new selection affordance's role/name, the detail dialog's and both
confirmation dialogs' ARIA roles and focus trapping, correct labelling on every field (including a
fix for ensuring sub-task text inputs carry distinct accessible names), deterministic focus-return
on every close path, and WCAG AA color contrast reusing existing palette values. Out of scope:
bulk edit/delete, undo/restore of a deleted task, drag-and-drop reordering, and any offline/PWA
sync changes. Approved by the user on 2026-10-11.

## Solution

A new sibling modal, `TaskDetailModal.vue`, opened directly into editable form (no separate
read-only view, no "Edit" button), backed by a new singleton composable `useTaskDetail.ts`
mirroring `useAddTaskModal.ts`'s pattern exactly. `open(taskId)` re-seeds every draft field fresh
from the live store task on each call, so reopening after an edit always shows current values and
never leaks a previous task's draft. `save()` builds a single `updateTask` payload (including a
sub-task mapping that carries forward each sub-task's _live_ `done` state, not a stale snapshot),
validates name/due-by exactly like `AddTaskModal.vue`, and closes on success. `requestDelete()`/
`confirmDelete()` route through a new `TaskDetailDeleteDialog.vue`; `requestClose()` diffs the
draft against the stored task (via `hasUnsavedChanges`, deliberately never reading `done` or
per-sub-task `done`) and routes through a new `TaskDetailDiscardDialog.vue` only when there's an
actual difference. `toggleDone()`/`toggleSubTaskDoneInView()` call the existing, unmodified
`toggleTaskDone`/`toggleSubTaskDone` directly, so the board's own checkbox and the detail view's
copy stay in sync with no reload.

On `NowNextLaterBoard.vue`, the task's visible name moves out of a `<label for>` association into
its own `<button class="task-open-button">` (native, so it's keyboard-operable for free), and the
checkbox gets its own `aria-label="{{task.name}}"` in place of the label association — keeping the
checkbox's accessible name (and the existing e2e `taskDoneToggle` locator) unchanged while giving
the two controls independent click targets. `CollapsibleSection.vue`'s heading gains
`tabindex="-1"` purely as a scripted (never Tab-reachable) fallback focus target for when a task is
deleted while its detail view is open. `App.vue`'s existing `.app-background` inert/aria-hidden
condition now also covers the new modal. No ADR was added — every pattern reused here
(singleton composable, custom overlay + `useFocusTrap.ts`, `role="alertdialog"` confirmation bound
directly to its composable) is already established precedent.

During solution review (cycle 1), a design gap was caught and fixed before implementation: every
editable sub-task text input shared the identical `aria-label="Sub-task text"`, making rows
indistinguishable to screen-reader users. Resolved in the updated design with position-based
`Sub-task N text` labels, approved in review cycle 2 (filed as #145, see "Bugs raised").

## Test changes

- `tests/unit/task-detail/composable.test.ts` (new) — seeding on `open()`, full-draft replacement
  across two different tasks, no-op on an unknown id, the unsaved-changes diff per field (and its
  deliberate exclusion of `done`/sub-task `done`), discard/save/delete flows, the sub-task-`done`
  "freshest live value at save time" behavior, and that `toggleDone`/`toggleSubTaskDoneInView`
  call the real, unmodified store functions (spied on the actual module, not a mock).
- `tests/unit/task-detail/components.test.ts` (new) — `TaskDetailModal.vue`'s close-wiring (X,
  Escape, backdrop vs. content click), field-by-field interaction wiring, done-checkbox and
  sub-task-done-checkbox wiring (including that an `isNew` sub-task row renders no checkbox),
  distinct per-row accessible names across multiple sub-task rows, Save/Delete wiring with
  focus-on-error, and `jest-axe` scans (WCAG tags per `.claude/STANDARDS.md`, `color-contrast`
  disabled) across every meaningfully distinct state — default open, name-error, due-by-error,
  populated multi-row sub-tasks, sub-task-input-open — plus one scan each for the new discard and
  delete confirmation dialogs.
- `tests/unit/now-next-later/components.test.ts` (updated) — added the `useTaskDetail` mock,
  asserts clicking a task's name button calls `open` with its id, that the done checkbox's
  accessible name is still the task name, that clicking the checkbox never calls `open`
  (confirms the two click targets stay independent), and that the section heading carries
  `tabindex="-1"`; existing `jest-axe` scans re-run clean against the restructured markup.
- `features/task-detail-edit-delete.feature` + `features/step_definitions/task-detail.steps.ts`
  (new, plus updated `task-store.steps.ts`/`energy.steps.ts`) — five multi-step journeys with no
  unit-equivalent grain: full-field pre-fill on open, edit-and-save moving a task between sections
  reflected on the board, delete-through-confirmation removing a task from the board, a full
  discard-then-reopen round trip showing the original values survive a discard, and a done-toggle
  surviving a discard of an unrelated field edit in the same session.
- `tests/e2e/task-detail.spec.ts` (new) + updated `tests/e2e/helpers.ts`/`tests/e2e/a11y.spec.ts` —
  real-browser coverage of open/edit/save/persist-across-reload, both validation-error paths,
  delete-through-confirmation, discard-vs-cancel focus-return, done/sub-task-done persistence
  across a reload, fallback focus-to-section-heading after deleting the open task, a full
  keyboard-only pass through the dialog's focus trap, and a mobile-viewport 44px tap-target check.
  `tests/e2e/a11y.spec.ts` adds `@axe-core/playwright` scans (same WCAG tag scope) for the detail
  view open with multiple sub-tasks, the discard dialog, and the delete dialog.
- Storybook — `src/components/TaskDetailModal.stories.ts`, `TaskDetailDiscardDialog.stories.ts`,
  and `TaskDetailDeleteDialog.stories.ts` (new), plus an update to
  `NowNextLaterBoard.stories.ts` adding the `useTaskDetail` mock and an
  open-affordance interaction story. Across all 12 `.stories.ts` files in the repo there are now 31
  exported stories, 18 with a `play`-function interaction test; `@storybook/addon-a11y` (same WCAG
  tag scope, color-contrast left enabled since this runs in real headless Chromium) scans all 31 —
  31/31 pass.

## Accessibility

- **Req 15 (selection affordance)** — `NowNextLaterBoard.vue`'s new `<button class="task-open-button">`
  is a native button; its text content is the task's name, giving it a correct role and accessible
  name for free, and native Tab/Enter/Space operability.
- **Req 16 (detail dialog)** — `TaskDetailModal.vue` uses `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby="task-detail-heading"`, and reuses `useFocusTrap.ts` unmodified via its own
  `contentRef` — covered by `jest-axe` in `components.test.ts` and `@axe-core/playwright` in
  `tests/e2e/a11y.spec.ts`.
- **Req 17 (field labelling)** — every field keeps `AddTaskModal.vue`'s established pattern
  (`<label for>`, `role="group"`/`aria-pressed` pickers, `aria-invalid`/`aria-describedby` error
  wiring). The one new labelling decision — each sub-task row's text input — was initially shipped
  with an identical `aria-label="Sub-task text"` across rows (design review caught this as #145);
  the fix uses position-based `Sub-task N text` labels, with unit, Storybook, and e2e cases added
  specifically asserting distinct accessible names across multiple rows.
- **Req 18 (confirmation dialogs)** — `TaskDetailDiscardDialog.vue`/`TaskDetailDeleteDialog.vue`
  both use `role="alertdialog"`, their own `useFocusTrap.ts` call, and default focus on "No" —
  scanned by `jest-axe`/`@axe-core/playwright` in their own distinct states.
- **Req 19–20 (keyboard operability, focus management)** — every new control is a native
  `<button>`/`<input>`/`<textarea>`; no new `outline: none` rules were introduced. Closing the
  detail view by any path returns focus to the originating task's open-button, or — if that task
  was deleted while the view was open — to its section's now-focusable (`tabindex="-1"`) heading,
  verified by e2e's dedicated delete-then-focus-check case.
- **Req 21 (color contrast)** — no new colors; every new piece of UI reuses the existing
  `#1a1a1a`/`#595959`/`#767676`/`#d6d6d6`/`#e2e2e2` palette already contrast-audited elsewhere.
- **Req 22 (inert background)** — `App.vue`'s `.app-background` inert/aria-hidden condition now
  also covers `TaskDetailModal` (and, by nesting, its two confirmation dialogs).
- **Accessibility-labelled issue**: #145 (design review, cycle 1) — the shared-`aria-label`
  sub-task text input gap described above. Resolved in the updated design before any code was
  written; approved in review cycle 2.

## Bugs raised

Both issues related to #144 are closed.

**design (1)**:

- **#145** — opened 2026-10-11T17:07:05Z, closed 17:10:49Z (also labelled `accessibility`). Caught
  during the solution-design review loop (cycle 1): every editable sub-task text input shared the
  identical `aria-label="Sub-task text"`, leaving rows indistinguishable to screen-reader users
  (Requirement 17). Resolved in the updated design with position-based `Sub-task N text` labels
  plus distinct-accessible-name assertions added across the unit, Storybook, and e2e layers.
  Approved in design review cycle 2.

**ci (1)**:

- **#147** — opened 2026-10-11T17:59:14Z, closed 18:09:07Z (also labelled `security`). The
  Dependency audit CI job (`npm audit --omit=dev --audit-level=high`) failed on PR #146 against
  pre-existing, newly-published advisories in production dependencies (`@vue/server-renderer`/
  `vue` XSS via missing CR in attribute-name blacklist; `source-map-js` event-loop DoS via indexed
  source-map section offsets) — not introduced by this change's own code. Fixed by bumping `vue`
  to `^3.5.43` and running `npm audit fix` for `source-map-js`; the Dependency audit job went green
  on the same PR.

## Coverage

Combined coverage (unit + BDD + e2e + Storybook, `npm run test:coverage:merge`): **95.76%**, above
the 90% threshold in `.claude/STANDARDS.md`.

## Outcome

**Deployed.** Merged to `main` at `7aa66b0adbca9cb2c08a2f78cb5e921536c2d124` (PR #146); CD run
38162612300 completed successfully and the change is live.

## Time taken

Started 2026-10-11T16:51:40Z, completed 2026-10-11T18:17:07Z — **1.42 hours** total elapsed. This
figure spans human wait time (the requirements and manual-test human gates, two design-review
turnaround cycles, and CI/CD watch time), not just active engineering time, and should not be read
as a pure implementation-effort estimate.
