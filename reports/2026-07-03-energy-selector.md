# Add energy level selector with encouraging toast messages

**Branch:** `feat/energy-selector` · **PR:** [#83](https://github.com/lauz9888/untangle/pull/83) · **Merged:** 2026-07-03

## Requirement

Add an energy-selection panel to the header, positioned to the right of the logo/tagline block, with three options: Low, Medium, High.

- No level is selected on initial page load; selection never persists across reloads (always resets to none).
- Clicking an unselected level selects it and shows a toast notification with one message chosen at random from a pool of 20 encouraging/reassuring messages written for that level's tone (Low: gentle/permission-giving, Medium: balanced, High: energizing).
- Clicking the currently-selected level deselects it (returns to no selection) and shows no toast.
- Clicking a different, unselected level switches selection to it and shows a new random toast for the newly selected level.
- The toast auto-dismisses after a few seconds and also has a manual close (X) button.
- Only one toast is visible at a time; a new selection replaces any toast currently showing.

Four decisions were confirmed with the user up front: no persistence across reloads, auto-dismiss + manual close (not one or the other), re-clicking the active level deselects it (rather than being a no-op), and the 60 messages would be drafted during implementation rather than reviewed as a separate approval step.

## Solution

New `src/composables/useEnergyLevel.js` — a module-level singleton following the same pattern prescribed for `useTasks.js`: `selectedLevel`, `toastMessage`, and `toastId` refs, plus `selectLevel(level)` and `dismissToast()`. Three 20-message pools (`LOW_MESSAGES`, `MEDIUM_MESSAGES`, `HIGH_MESSAGES`) are exported as named constants for test verification. `selectLevel` toggles off on a repeat click, otherwise selects the level and picks a random message; `toastId` increments on every new toast so the toast component can distinguish "new toast" from "same toast re-rendered."

Two new thin components: `EnergySelector.vue` (three buttons wired to the composable, `aria-pressed` reflecting selection) and `ToastNotification.vue` (renders the toast, auto-dismisses via a `setTimeout` restarted on every `toastId` change, and a manual close button). `App.vue`'s header changed from an absolutely-positioned single column to a flex row with the existing logo/tagline on the left and `<EnergySelector />` on the right; `<ToastNotification />` was added once, fixed to the bottom of the viewport. No new dependencies — a custom toast was simpler than integrating a third-party library for one message pool.

## Bugs raised and resolved

| #                                                     | Category         | Detected by               | Summary                                                                                                                         | Resolution                                                                                                          |
| ----------------------------------------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [#81](https://github.com/lauz9888/untangle/issues/81) | `unit-test`      | `unit-test-review`        | Test coverage was missing for the toast's auto-dismiss timer — only the manual close path was tested                            | Added fake-timer tests covering auto-dismiss, timer restart on a new toast, and no stray dismiss after manual close |
| [#82](https://github.com/lauz9888/untangle/issues/82) | `implementation` | `solution-implementation` | Manual close only cleared the message, leaving the pending auto-dismiss timeout running — it would fire again redundantly later | Added a local `handleClose()` that cancels the pending timeout before calling `dismissToast()`                      |

Both were caught by the pipeline doing exactly what it's for: the review stage noticing a coverage gap before implementation, and the resulting stricter test then catching a real timer-cleanup bug during implementation.

## Time taken

Wall-clock time from requirement analysis to merge: **~29 minutes** (18:27:10 → 18:55:54 UTC).

This spans human wait time as well as engineering time — it is not a measure of pure implementation effort. Roughly:

- **Human response time** (~12 min): four clarifying questions up front, requirement approval, and manual testing (the user trying the feature locally and confirming it worked).
- **CI wait time** (~1 min): one CI run against GitHub Actions' 9 required jobs, all green first try.
- **Active engineering time** (~16 min): design, TDD test-writing (including one loop-back to add missing auto-dismiss coverage), implementation (including one bug fix that coverage gap caught), e2e tests, and the wiki update — this is the part that scales with change complexity; the human/CI waits above are largely fixed overhead per change.
