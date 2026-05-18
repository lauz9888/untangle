# Change report: Remove unused prevActiveDay function from useStreak.js (Fixes #67)

**PR**: [#70](https://github.com/lauz9888/untangle/pull/70) · **Merged**: 2026-05-18 · **Commit**: [`c8a85b2`](https://github.com/lauz9888/untangle/commit/c8a85b266129e4ede5e0b4268bf12f4126d13829) · **Cycle time**: 6m

## What changed

Deleted the `prevActiveDay` function and its preceding comment from `src/composables/useStreak.js` (10 lines removed). The function walked backwards from a given date to find the most recent non-excluded day, but was never called anywhere in the file or codebase. No other files were touched.

## Why

Eliminated dead code flagged by ESLint as a `no-unused-vars` warning (issue #67). The existing `hasActiveDayBetween` function already satisfies all streak logic, so `prevActiveDay` was a leftover with no role in the implementation.

## Bug analysis

**1 bug raised** across this change.

| # | Title | Detected at | Status |
|---|---|---|---|
| [#67](https://github.com/lauz9888/untangle/issues/67) | Dead code: prevActiveDay unused in useStreak.js | manual | Fixed before merge |

**Analysis**: The single bug was identified manually rather than by automated tooling — ESLint surfaced the warning but it was the developer who triaged it and opened the issue. This is expected for a dead code finding: static analysis can flag the symptom but human judgement is needed to decide whether to delete or wire up the orphaned function. No bugs were introduced during the fix itself, and the full automated suite (271 unit tests, 132 e2e tests) confirmed no regressions. A clean, low-risk change with the quality signal you would expect from a pure deletion.
