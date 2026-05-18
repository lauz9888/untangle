# Change report: Lower bug-creation threshold across all workflow skills

**PR**: [#46](https://github.com/lauz9888/untangle/pull/46) · **Merged**: 2026-05-18 · **Commit**: [`e08e759`](https://github.com/lauz9888/untangle/commit/e08e7597737ba88b7be672e32968ef8b5d673642) · **Cycle time**: 2h 20m

## What changed

Five workflow skill files in `.claude/skills/` were updated with targeted single-line edits to lower the threshold at which `/report-bug` is triggered. `unit-test-analysis.md` and `e2e-test-analysis.md` now fire on any test failure rather than only "real bugs in the source." `deploy-branch.md` and `deploy-main.md` now fire on any CI test failure except pure infrastructure issues (network errors, missing environment dependencies). `requirement-analysis.md` was updated to log a bug whenever the developer is asking for something to be fixed, not only when they explicitly describe something as broken.

## Why

The previous thresholds required a skill to judge whether a failure was a "real source bug" before logging it, which meant some unexpected behaviors went untracked. The goal is to ensure every instance of something behaving other than expected is captured as a GitHub issue, regardless of where in the workflow it surfaces.

## Bug analysis

No bugs were raised during this change.
