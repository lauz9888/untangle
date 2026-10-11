# 0005. Stacked overlay dialogs with opener-origin tracking, and data-computed completion focus

Status: Accepted
Date: 2026-10-11

## Context

The Completed tasks panel (`CompletedTasksPanel.vue`) is a hand-rolled overlay dialog (ADR 0002).
Activating a row inside it opens the Task Detail modal on top of the panel while the panel stays
open (requirement 27). Task Detail can therefore now be opened from two origins, the board and the
panel, and each needs different focus behavior on close: the board returns focus to the task's
open-button (or the next/previous task / section heading after a completion), while the panel
returns focus to the row button (or its X). Two dialogs also compete for Escape and Tab.

Completing a task removes it from the board, so the element that held focus disappears. Reading a
neighbour from the DOM after the fact would depend on watcher flush timing and on which origin
triggered the completion.

## Decision

- Track the opener in `useTaskDetail.ts` as `openedFrom: 'board' | 'completed'`, set by
  `open(taskId, origin = 'board')` and deliberately not reset on close (same lifetime convention as
  `lastOpenedTaskId`), so post-close watchers in the board and the panel can read it. Each watcher
  acts only for its own origin.
- Isolate the two dialogs without a global dialog-stack manager: the panel overlay is `inert` and
  `aria-hidden` while Task Detail is open, Task Detail is a DOM sibling (not a descendant) so its
  key events never bubble into the panel's handlers, and DOM order in `App.vue` puts Task Detail on
  top at equal `z-index`.
- Compute the completion focus target from store data before the mutation:
  `getCompletionFocusTarget` in `useBoardOrdering.ts` (next not-done task in the section, else
  previous, else the section heading), held in the `useCelebration` singleton as
  `completionFocusTarget` and consumed once by the board, only when `openedFrom === 'board'`.

## Alternatives considered

- Close the panel before opening Task Detail: rejected, it loses the user's place and contradicts
  requirement 27.
- A global dialog stack manager: rejected as over-engineered for exactly two levels.
- Reading the focus neighbour from the DOM after removal: rejected, it depends on flush timing and
  has no origin safety.

## Consequences

- Any future third opener of Task Detail must extend the `openedFrom` union and add its own
  close-time focus watcher.
- The focus target is pure data, so it is unit-testable without mounting components.
