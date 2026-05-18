# Change report: Fix vite crash in unzipped repos, Vue warning in drag-drop tests, and add workflow edit gate

**PR**: [#49](https://github.com/lauz9888/untangle/pull/49) · **Merged**: 2026-05-18 · **Commit**: [`d6ed1d6`](https://github.com/lauz9888/untangle/commit/d6ed1d6b7fc4655aaa61ef1e3a83207b707d3a89) · **Cycle time**: 12m

## What changed

`vite.config.js` now guards `statSync('.git')` with an `existsSync` check so Vite starts correctly when the repository is downloaded as a zip rather than cloned. `src/composables/useDragDrop.js` wraps its `onBeforeUnmount` registration in a `getCurrentInstance()` check so the lifecycle hook only fires inside component setup contexts, removing a Vue runtime warning from unit tests. A new `PreToolUse` hook (`scripts/check-edit-gate.mjs`) was added to block edits to `src/` files when the workflow solution hasn't been approved, and `workflow-state.mjs` was updated to emit an explicit `ACTION REQUIRED` directive when a workflow is active rather than a passive state dump.

## Why

The Vite crash made the repo unusable for anyone who downloads it as a zip rather than cloning — a common path for recruiters and reviewers. The Vue warning, while non-blocking, was noise in the test output that could mask real issues. The workflow enforcement changes address a process gap where code was written before requirement and solution analysis had been completed.

## Bug analysis

**2 bugs raised** across this change.

| # | Title | Detected at | Status |
|---|---|---|---|
| [#47](https://github.com/lauz9888/untangle/issues/47) | Bug: vite.config.js crashes with ENOENT when .git does not exist | manual | Fixed before merge |
| [#48](https://github.com/lauz9888/untangle/issues/48) | Bug: useDragDrop triggers Vue onBeforeUnmount warning when called outside component setup | manual | Fixed before merge |

**Analysis**: Both bugs were identified through manual developer review rather than automated testing, which is the expected signal here — the Vite crash only occurs outside the normal dev environment (no `.git` folder), so no existing test would catch it, and the Vue warning was emitted to stderr in a passing test suite, meaning it required a human to notice it was there. The fact that neither was caught earlier points to a gap in environmental coverage rather than a logic-testing gap. Both were low-risk, single-line fixes with no side effects, and both were resolved within the same workflow session that identified them. The overall quality signal is clean: two genuine defects found and closed before merge, with no regressions in 271 unit tests and 132 E2E tests.
