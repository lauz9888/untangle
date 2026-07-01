---
name: report-bug
description: Logs a bug found outside the automated pipeline stages (manually, by a developer) as a GitHub issue, using the same tracker as every pipeline stage.
---

Thin wrapper around `scripts/bug-tracker.mjs` for bugs found manually — the `manual` detection source in `CLAUDE.md`'s bug-tracking table. Pipeline stages call `bug-tracker.mjs` directly instead of invoking this skill; use this when _you_ (or the user) spot something outside any stage.

## Steps

1. Pick the category. Default to `manual` unless the bug clearly belongs to a specific stage (e.g. you notice a design flaw while reading old code — that's `design`). See `scripts/bug-tracker.mjs`'s `CATEGORIES` list for the full set.
2. `node scripts/bug-tracker.mjs create <category> "<short title>" "<what you saw, how to reproduce>"`
3. If you fix it immediately in this session, either:
   - `node scripts/bug-tracker.mjs close <number> "<how it was fixed>"`, or
   - include `Fixes #<number>` in the fix commit message — the `post-commit` hook closes it automatically.
