# Change report: Always reset started_at on fresh requirement-analysis invocation

**PR**: [#45](https://github.com/lauz9888/untangle/pull/45) · **Merged**: 2026-05-18 · **Commit**: [`973312d`](https://github.com/lauz9888/untangle/commit/973312dabd12e7ec5c16e63ef477c157a1c61dc5) · **Cycle time**: 3m

## What changed

Updated `.claude/skills/requirement-analysis.md` to call `node scripts/workflow-state.mjs start` unconditionally at the top of every fresh invocation, rather than only when no state exists. Loop-backs are the sole exception — they preserve the existing `started_at` so the full cycle time across a loop is still measured correctly.

## Why

Stale `started_at` timestamps carried over from prior workflow sessions were causing cycle times to be wildly inflated. The previous change (PR #44) was reported as taking 2h 2m when it actually took ~10 minutes, because the workflow state had never been reset before that session began.

## Bug analysis

No bugs were raised during this change.
