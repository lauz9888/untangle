# Change report: Fix coverage gate, add CI coverage job, test drag/drop and HistoryPanel

**PR**: [#43](https://github.com/lauz9888/untangle/pull/43) · **Merged**: 2026-05-18 · **Commit**: [`a7bdbd0`](https://github.com/lauz9888/untangle/commit/a7bdbd040bdd696cd46e6c83fd5cac743caad558) · **Cycle time**: 1h 54m

## What changed

Six quality improvements addressing feedback from the previous review. The local `todayString()` function in `useTasks.js` was fixed to use local date components instead of a UTC ISO string, eliminating a latent timezone bug that could misidentify "today" around midnight. `src/main.js` was excluded from the coverage config, and new unit tests were added for `useTaskDrag` (8 tests covering HTML5 drag and the full touch drag lifecycle) and `HistoryPanel` (11 tests covering empty state, bar chart rendering, best-week section, close interactions, and accessibility attributes). A `coverage` job was added to `ci.yml` so the gate is enforced on every PR, and a "What this repo demonstrates" recruiter section was added to `README.md`.

## Why

Coverage was failing at ~69% statements / ~70% lines against an 80% threshold, `useDragDrop.js` and `HistoryPanel.vue` were the largest under-tested areas, the CI pipeline had no coverage visibility, and the README lacked context for anyone evaluating the repo as a portfolio or engineering sample.

## Bug analysis

No bugs were raised during this change.

The implementation was entirely additive — new test files, a one-line coverage exclusion, a new CI job, a four-line bug fix, and a README section. The only source-code change was the `todayString()` fix, which was a straight substitution of an already-correct pattern from `useStreak.js`. With no logic branches to miss and no new component interactions to break, the clean run is expected rather than notable. The quality signal here is in the coverage numbers themselves: the new tests exercise code paths (touch drag ghost creation, drop dispatch, HistoryPanel best-week computation) that were previously invisible to the test suite.
