---
name: e2e-test-analysis
description: Step 8 of the dev pipeline (TDD red phase for e2e). Adds, updates, and removes Playwright specs to reflect the change.
---

Step 8 of the pipeline in `CLAUDE.md`. Runs after `solution-refactor` reaches green.

## Steps

1. Read `fields.requirement_text` and `fields.solution_text` (or `fields.e2e_test_review_feedback` if looping back).
2. Write/update specs in `tests/e2e/` covering the user-facing flow(s) the requirement describes. Use the shared helpers in `tests/e2e/helpers.js` (`addTask`, `taskCard`, `openEdit`, etc.) rather than duplicating selectors.
3. Every e2e test clears `localStorage` and reloads before running, per `CLAUDE.md`, so tests stay independent.
4. Remove or update specs the change makes obsolete.
5. `node scripts/workflow-state.mjs approve e2e_test_write`
6. Invoke `e2e-test-review` via the Skill tool.
