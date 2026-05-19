# Change report: Enforce deploy-branch as the mandatory first step for code changes

**Commit**: [`96fa61f`](https://github.com/lauz9888/untangle/commit/96fa61f) · **Merged**: 2026-05-19 · **Cycle time**: 7m

## What changed

`document-analysis` now auto-detects whether a change is code or doc-only and routes accordingly: code changes go straight to `deploy-branch` with no question asked, while doc-only changes (all modified files matching `*.md`, `*.txt`, or `reports/`) ask the developer and default to `deploy-main`. The `deploy-main` skill description was updated to clarify it is for post-branch-review merges or doc-only changes — not a bypass for code changes. The `CLAUDE.md` workflow table was updated to reflect `deploy-branch` as the default for code changes and `deploy-main` as the manual trigger after browser sign-off.

## Why

Every code change now requires browser verification and human sign-off before merging to main, enforcing CI as a genuine pre-merge gate rather than a post-hoc check.

## Bug analysis

No bugs were raised during this change.
