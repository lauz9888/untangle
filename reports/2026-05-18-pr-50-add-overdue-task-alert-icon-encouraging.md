# Change report: Add overdue task alert icon with encouraging message

**PR**: [#50](https://github.com/lauz9888/untangle/pull/50) · **Merged**: 2026-05-18 · **Commit**: [`a4637bc`](https://github.com/lauz9888/untangle/commit/a4637bc63d6326b5824a43edecb213e7bdaeacd3) · **Cycle time**: 3h 4m

## What changed

`src/components/TaskCard.vue` gained an overdue alert icon — a persistent `!` badge positioned absolutely in the top-right corner of any task card whose due date is in the past. Clicking the icon opens the task in edit mode, where a randomly chosen message from a curated list of 15 positive prompts is displayed between the energy selector and the date pickers, encouraging the user to commit to a new realistic due date. The message clears on save or cancel. Ten unit tests and seven E2E tests were added to cover the icon's visibility logic, the click-to-edit flow, and message lifecycle.

## Why

Users with overdue tasks had no visible signal that a deadline had passed — the only existing indicator was a subtle colour change on the due date chip. This change makes overdue status impossible to miss and provides an in-context, constructive prompt to update the timeline rather than leave it stale.

## Bug analysis

No bugs were raised during this change.

**Analysis**: A clean pass with no defects found at any stage — requirement analysis, implementation, QA review, unit tests, E2E tests, and manual branch testing all cleared without issue. The change was self-contained (single file, no composable or data-model changes), which kept the risk surface small. The absence of bugs here is consistent with that scope: there were no state transitions, persistence paths, or cross-component interactions that typically generate subtle defects. The quality signal is strong.
