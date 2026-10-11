```metrics
tracking_issue: 149
started_at: 2026-10-11T18:43:48Z
completed_at: 2026-10-11T20:40:00Z
total_hours: 1.94
coverage_percent: 98.13
storybook_story_count: 45
storybook_interaction_test_count: 32
storybook_a11y_pass_rate: 45/45 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 10
  unit-test: 0
  bdd-test: 0
  e2e-test: 2
  storybook-test: 0
  qa: 1
  deploy-path: 0
  manual-test: 0
  ci: 0
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 7
```

# Post-change report: task-completion-celebration

Tracking issue #149, feature PR #163 (squash merge `b55a572`), branch `feature/task-completion-celebration`, housekeeping branch `docs/task-completion-celebration`.

## Requirements

Request: on completing a task (board checkbox or Task Detail modal), show one of 50 random celebratory messages, shower the screen in confetti, and remove the task from the board.

- Completion is a `done` false-to-true transition via either path. Un-completing, sub-task toggles and loading completed tasks from storage never celebrate.
- A new singleton pool of exactly 50 distinct messages, shown in its own notification (separate from the shared toast). It auto-dismisses after 6 s, can be closed manually, and a second completion replaces the first.
- Hand-rolled confetti (no new dependency) that clears itself within 5 s, never blocks pointer events, and is suppressed under `prefers-reduced-motion` (message still shown).
- Done tasks never render on the board but stay in the store with `done: true`.
- Completing in Task Detail closes it immediately (no discard prompt, edits dropped) and moves focus to the next or previous task button in the section, else the section heading.
- A new header "Completed (N)" button opens a Completed tasks panel. The panel lists done tasks, most recently updated first, and supports un-completing. Task Detail can stack above it, with opener-origin focus return.
- Requirement change discovered at QA: the celebration card was originally top-center and covered header controls (#161). The user chose "just below the header". Reqs 9, 9a and 30 were amended and re-approved on 2026-10-11, adding a non-overlap criterion at 1280/800/641/640/390px.

## Solution

- `useCelebration.ts` (singleton): message pool, notification and confetti state and timers, a reduced-motion check, and `toggleTaskDoneWithCelebration`, which both completion paths share. `useTasks.ts` is unchanged.
- `useBoardOrdering.ts`: pure helpers that group and sort active tasks and compute the data-based completion focus target before the toggle.
- `useCompletedPanel.ts` (singleton): panel state, completed list and count, un-complete.
- New components: `CelebrationNotification.vue` (persistent `role="status"` region; card positioned from the live `#app-header` bottom edge with a 96px floor), `ConfettiLayer.vue` (aria-hidden DOM/CSS pieces, keyed per burst), `CompletedButton.vue`, `CompletedTasksPanel.vue`.
- Changed: `useTaskDetail.ts` (`openedFrom`, completion closes the modal), `NowNextLaterBoard.vue`, `App.vue` (inert condition now includes the panel).
- ADRs 0005 (stacked overlay dialogs with opener-origin tracking) and 0006 (hand-rolled CSS confetti, no dependency) were added.

## Test changes

Unit:

- `tests/unit/board-ordering/composable.test.ts`: grouping, done filtering, and focus-target selection.
- `tests/unit/celebration/composable.test.ts`: pool, random pick, timers, confetti timing, reduced motion, completion detection.
- `tests/unit/celebration/components.test.ts`: notification and confetti states, pause on hover/focus, focus restore, placement. Includes jest-axe scans.
- `tests/unit/completed-panel/composable.test.ts`: ordering, count, un-complete, open task.
- `tests/unit/completed-panel/components.test.ts`: button and panel states (empty, populated, stacked), focus handling. Includes jest-axe scans.
- `tests/unit/now-next-later/components.test.ts` (changed): done tasks hidden and focus after completion. jest-axe scans kept.
- `tests/unit/task-detail/composable.test.ts` (changed): completion closes the modal, `openedFrom`.

BDD:

- `features/task-completion.feature` with `features/step_definitions/task-completion.steps.ts`: 3 journeys (board complete then restore from panel; Task Detail complete with a dirty draft; stacked flow with un-tick and re-tick).

E2e:

- `tests/e2e/task-completion.spec.ts`: board and modal completion, reload persistence, reduced motion, toast coexistence, panel flows, mobile sizing, header non-overlap at 5 widths, and the scrolled-header floor.
- `tests/e2e/helpers.ts`, `tests/e2e/now-next-later.spec.ts` and `tests/e2e/task-detail.spec.ts` (changed).
- `tests/e2e/a11y.spec.ts` (changed): `@axe-core/playwright` scans of the celebration with confetti, the header button, and the panel in empty, populated and stacked states.

Storybook (45 stories, 32 with play functions; `addon-a11y` scans every story with color-contrast enabled):

- `CelebrationNotification.stories.ts`: states including a header-above placement story and a focused close button.
- `ConfettiLayer.stories.ts`: idle and bursting.
- `CompletedButton.stories.ts`: zero count and with count.
- `CompletedTasksPanel.stories.ts`: empty, populated, stacked, long mobile list.
- `NowNextLaterBoard.stories.ts` (changed): done tasks hidden.

Final suites: unit 426, BDD 14, e2e 143, Storybook 45, all green.

## Accessibility

- Celebration (A1-A4): persistent `role="status"` live region present before the message is inserted. Native close button with an accessible name and focus ring. 6 s auto-dismiss, paused on mouse hover or focus. White on `#1a1a1a`. Covered by jest-axe, Storybook a11y, and e2e axe.
- Confetti (A5, A6): `aria-hidden`, non-focusable, `pointer-events: none`, suppressed under reduced motion, no strobing. Scanned by jest-axe, Storybook and e2e axe.
- Completed button (A8, A9): native button with `aria-haspopup="dialog"` and its accessible name includes the live count ("Completed (N)"). Scanned in unit, Storybook and e2e.
- Completed panel (A8, A9): `role="dialog"`, `aria-modal`, labelled heading, focus trap, named X, `ul`/`li` rows with named checkboxes, exposed empty state, inert when Task Detail is stacked above. Scanned in empty, populated and stacked states across all three layers.
- Focus never drops to `<body>` (A7): data-computed board target, panel and Task Detail return rules, neighbor-row focus on un-complete.
- Accessibility-labelled issues: #150 (neighbour-focus lookup relied on Vue job ordering; replaced by a data-computed target), #151 (dismiss dropped focus to body; focus-restore rule added), #154 (live region outside aria-modal and mobile overlap; limitation documented and overlap fixed), #156 (focus-restore ignored alertdialogs; fixed), #157 (card close not keyboard-reachable under the modal trap; limitation documented, body fallback removed), #162 (scrolled-header card position covered the modal X on mobile; 96px floor added), #161 (card covered header controls; requirement amended, card moved below the header). All closed.

## Bugs raised

Design review (3 cycles plus the placement amendment), stage `design`:

- #150 neighbour-focus lookup relies on Vue job ordering. Opened 19:11:33Z, closed 19:14:44Z. Replaced the DOM lookup with a focus target computed from store data. (accessibility)
- #151 auto-dismiss/close drops focus to body. Opened 19:11:34Z, closed 19:14:50Z. Added a focus-restore rule. (accessibility)
- #152 confetti piece keys reused across bursts. Opened 19:11:35Z, closed 19:14:46Z. Keys now include a burst id.
- #153 BDD "absent from board" assertion vacuous (also labelled `bdd-test`; counted once as `design`, the stage where it was caught). Opened 19:11:37Z, closed 19:14:48Z. The assertion now goes through the shared `groupActiveTasksBySection` helper.
- #154 live region outside aria-modal dialogs; card overlap on mobile. Opened 19:11:39Z, closed 19:14:52Z. Limitation documented, overlap addressed. (accessibility)
- #155 celebration pause flag can get stuck. Opened 19:14:54Z, closed 19:16:42Z. The composable keeps no pause flag and the component resets its flags.
- #156 focus-restore fallback ignores open alertdialogs. Opened 19:14:55Z, closed 19:16:45Z. A single topmost-dialog rule was added. (accessibility)
- #157 card close not keyboard-reachable under the modal trap; body-focus fallback. Opened 19:14:57Z, closed 19:16:46Z. Limitation documented, fallback is now `<main>`. (accessibility)
- #158 card may cover the modal X on mobile. Opened 19:14:58Z, closed 19:16:48Z. Side inset added; later superseded by the below-header placement.
- #162 scrolled-header card position covers the modal X on mobile. Opened 19:52:15Z, closed 19:53:58Z. Added a 96px minimum top. (accessibility)

E2e test authoring, stage `e2e-test`:

- #159 e2e uses `check()`/`uncheck()` on self-removing checkboxes. Opened 19:37:30Z, closed 19:38:16Z. Switched to click-based interaction.
- #160 `task-persistence.spec` asserts a done task stays on the board. Opened 19:40:28Z, closed 19:42:59Z. Assertion updated to the new behavior.

QA, stage `qa`:

- #161 celebration card covers header controls. Opened 19:48:42Z, closed 20:07:49Z. User chose "just below the header". Requirements 9, 9a and 30 were amended and re-approved, the design was amended (see #162), and tests and implementation were updated. Cost: a requirements and design re-loop at QA. (accessibility)

This is a requirement change discovered at QA rather than a coding defect, relevant to shift-left analysis: the placement conflict with the header was not caught at requirements or design review. No security issues were raised. CI passed first time (no `ci` bugs) and the CD run deployed cleanly (no `cd` bugs). Manual testing was delayed by dev-server lifecycle problems, not by a product defect, so no `manual-test` bugs were raised.

Stage totals: design 10, e2e-test 2, qa 1 (13 unique issues). Category: accessibility 7, security 0.

Noted at QA and carried to manual test: the header touches the board heading (0px gap) at 641-900px, which is cosmetic.

## Coverage

Combined statement coverage (unit + BDD + e2e + Storybook): 98.13% (threshold 90%).

## Outcome

`deployed`. The change is live on GitHub Pages (CD run 38172667000, merge `b55a572`).

## Time taken

Started 2026-10-11T18:43:48Z, completed 2026-10-11T20:40:00Z: about 1 hour 56 minutes (1.94 hours). This is wall-clock time and includes human wait time (requirements and re-approval gates, manual testing and its dev-server delays, CI and CD waits), not only active engineering time.
