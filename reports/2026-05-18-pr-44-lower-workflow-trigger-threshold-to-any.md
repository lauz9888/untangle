# Change report: Lower workflow trigger threshold to any change-request verb

**PR**: [#44](https://github.com/lauz9888/untangle/pull/44) · **Merged**: 2026-05-18 · **Commit**: [`bd577ce`](https://github.com/lauz9888/untangle/commit/bd577ce607fc00f564a67b067d9a31d671e06d77) · **Cycle time**: 2h 2m

## What changed

Removed the question-word exclusion regex from the `check-prompt` handler in `scripts/workflow-state.mjs`. Previously the trigger had two conditions: a change-action verb must be present AND the message must not start with a question word. The second condition has been removed, so the workflow now fires on any message containing a change-action verb regardless of phrasing.

## Why

Requests phrased as questions — "can you add X?", "could you fix Y?" — were silently skipped by the workflow trigger, meaning the full development pipeline was never started for that common conversational phrasing. The change ensures the workflow activates for any genuine change request.

## Bug analysis

No bugs were raised during this change.
