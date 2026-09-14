# 0002. Custom overlay-based dialog implementation (not native `<dialog>`) for the Add Task modal

Status: Accepted
Date: 2026-09-14

## Context

The Add Task modal (`.workflow/add-task-modal/requirements.md`) needs a fully accessible modal
dialog plus a nested close-confirmation dialog: `role="dialog"`/`role="alertdialog"` +
`aria-modal="true"` (Requirements 5, 29), focus moving into the dialog on open (Requirement 6),
Tab/Shift+Tab cycling only within the open dialog (Requirement 7), Escape closing/cancelling
appropriately (Requirements 9, 28), backdrop-click closing (Requirement 25), and focus returning
predictably on every close path (Requirements 10, 27, 28, 39). No modal/dialog precedent exists
anywhere in `src/` (confirmed in the requirements' Context section — no `<dialog>` usage, no
overlay component, no focus-trap utility).

The HTML `<dialog>` element with `.showModal()` was evaluated first, since it provides most of
this natively at zero new dependency cost: browser-managed focus containment (no manual Tab-trap
needed), a `cancel` event fired on Escape (interceptable via `event.preventDefault()`), and a
`::backdrop` pseudo-element whose clicks surface as a `click` event with `event.target` equal to
the dialog element itself.

Direct testing against this repo's pinned unit-test environment (`jsdom@^25.0.1`, the version
`vitest.setup.ts`/`tests/unit/**` actually run under) showed `HTMLDialogElement.prototype.showModal`
and `.close` are both unimplemented in that version — calling either throws
`TypeError: showModal is not a function`. Reproduced directly:

```
node -e "const {JSDOM}=require('jsdom'); \
  const d=new JSDOM('<dialog></dialog>').window.document.querySelector('dialog'); \
  d.showModal()"
// TypeError: dlg.showModal is not a function
```

This codebase's established test-organisation convention (`CLAUDE.md`'s "Test organisation")
pairs every component with a `tests/unit/<feature>/components.test.ts` that mounts it with
`@vue/test-utils` under jsdom. Any `onMounted`/`watch` callback that unconditionally calls
`showModal()` would throw and fail every such test for `AddTaskModal.vue`/`CloseConfirmDialog.vue`
outright. Working around this with jsdom-only feature-detection/fallback shims would reintroduce
exactly the manual focus-trap/Escape/backdrop code native `<dialog>` was chosen to avoid, while
making tested behavior diverge from real, shipped behavior.

Two options were considered:

1. Native `<dialog>` + `.showModal()`, with jsdom-only fallback shims to keep unit tests running.
2. A custom overlay: a `position: fixed` backdrop `<div>` wrapping a content `<div role="dialog"
   aria-modal="true">`, with hand-rolled Tab-cycling, an `@keydown.esc` handler, and `@click.self`
   for backdrop-click detection — all plain DOM/Vue mechanisms that behave identically under jsdom
   and a real browser.

## Decision

Implement the Add Task modal and its close-confirmation dialog as custom overlay `<div>`s
(option 2), not native `<dialog>`/`.showModal()`. Focus containment is handled by a new,
non-singleton `src/composables/useFocusTrap.ts` factory (one fresh instance per open dialog,
following the same per-instance-composable precedent as ADR 0001, since focus-trap state has
exactly one owning consumer per call site and no cross-component sharing need).
`AddTaskModal.vue` and `CloseConfirmDialog.vue` each call it locally.

## Consequences

- Unit tests (`tests/unit/add-task-modal/components.test.ts`, `tests/unit/focus-trap/composable.test.ts`)
  run identically under jsdom and real browsers — no environment-specific branching in application
  code.
- More code to own than native `<dialog>` would have needed (the small `useFocusTrap` composable,
  plus manual Escape/backdrop wiring in each dialog component) — a direct, measured trade against
  jsdom's current gap, not a stylistic preference.
- Because the confirmation dialog is a DOM descendant of the Add Task modal (nested inside
  `AddTaskModal.vue`'s template) rather than a native top-layer element, its keydown handling must
  explicitly stop propagation (`@keydown.stop`) and `AddTaskModal.vue`'s own focus-trap handler
  must no-op while `isConfirmOpen` is true, or both dialogs' Tab-handling would fire on the same
  keypress. Called out explicitly in `design.md`'s Accessibility section so it isn't lost during
  implementation.
- If a future jsdom release implements `HTMLDialogElement.showModal`/`.close`, this decision can be
  revisited; nothing here blocks migrating later, since the component-level contract (role,
  aria-modal, focus behavior) is identical either way.
- Because a custom overlay doesn't get the browser's native top-layer isolation that `<dialog>`
  provides for free — which, among other things, excludes the rest of the page from assistive-
  technology navigation while a dialog is open, independent of whether `aria-modal="true"` alone is
  honored — this design additionally applies `inert`/`aria-hidden="true"` to a wrapper
  (`.app-background` in `src/App.vue`) around everything except the Add Task modal itself while it
  is open. This is a direct, foreseeable consequence of choosing option 2 over native `<dialog>`,
  not an unrelated addition: `<dialog>`'s `.showModal()` would have made this unnecessary. See
  `design.md`'s Requirement coverage map (Req 7a) and Accessibility section for the exact mechanism
  and test coverage.
