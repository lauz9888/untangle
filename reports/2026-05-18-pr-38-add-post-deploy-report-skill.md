# Change report: Add /post-deploy-report skill to workflow

**PR**: [#38](https://github.com/lauz9888/untangle/pull/38) · **Merged**: 2026-05-18 · **Commit**: [`3a50648`](https://github.com/lauz9888/untangle/commit/3a5064841713a792f786cffb1086c198270757bd)

## What changed

A new `/post-deploy-report` skill was added to the developer workflow. It generates a markdown report in `reports/` after each merge, drawing on workflow state and the GitHub API to produce a change summary and analytical bug analysis. `deploy-main.md` was updated to trigger the skill automatically as its final step, and `CLAUDE.md` was updated to document the new step 9 and the `reports/` directory.

## Why

Each change previously left no persistent, reviewable record of what was built, why, or what quality signals the workflow produced. The report provides that record — linked to its PR and any associated bug issues — so past changes can be audited and quality trends identified over time.

## Bug analysis

No bugs were raised during this change.

This is consistent with the nature of the work: the change touched only workflow skill instructions and documentation, with no source code modifications. There was nothing to exercise automated or manual testing against, so the absence of bugs is expected rather than a quality signal about the process itself.
