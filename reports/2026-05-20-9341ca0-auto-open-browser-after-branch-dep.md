# Change report: Auto-open browser after branch deploy once server is ready

**Commit**: [`9341ca0`](https://github.com/lauz9888/untangle/commit/9341ca014f6f3a4e5dd277f6f94a6d613cfdc44d) · **Merged**: 2026-05-20 · **Cycle time**: 18m

## What changed

Updated `.claude/skills/deploy-branch.md` to automatically start the worktree dev server, poll `http://localhost:5174` every 2 seconds (up to 60 seconds), and open the URL in the browser once the server confirms it is ready. A QA approval marker step was also added before the push — a pre-existing gap that caused the pre-push hook to block every automated deploy-branch run.

## Why

Eliminated the manual step of navigating to the branch deployment URL after every deploy-branch run. The developer no longer needs to type or click the URL — the browser opens automatically once the server is confirmed responding.

## Bug analysis

**1 bug raised** during this change.

| # | Title | Detected at | Status |
|---|---|---|---|
| [#74](https://github.com/lauz9888/untangle/issues/74) | Bug: deploy-branch skill missing QA marker step before push | Development | Fixed before merge |

**Analysis**: The single bug was a pre-existing gap in the deploy-branch skill — the QA approval marker that the pre-push hook requires was never written, meaning every automated branch deploy would have been blocked at the push step. It was caught during development when the push was attempted for this very change. Finding it here rather than in CI is expected: the pre-push hook runs locally, not in CI. The skill file itself has no automated test coverage, so this kind of structural gap can only surface when the skill is actually executed — which is a reasonable trade-off given the low frequency of changes to workflow skills. Overall the quality signal is clean: one infrastructure bug caught and fixed inline, no regressions in the 439 tests.
