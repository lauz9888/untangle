---
name: post-deploy-report
description: Step 14 of the dev pipeline (final step). Writes the change report — requirements, solution, all bugs raised/resolved, and time taken — and lands it on main.
---

Step 14 of the pipeline in `CLAUDE.md`, run immediately after `deploy-main` merges the change.

## Steps

1. `node scripts/workflow-state.mjs get` for the full state: `fields.requirement_text`, `fields.solution_text`, `bugs[]`, `started_at`, `completed_at`, `loops[]`.
2. Compute total time taken (`completed_at - started_at`). State plainly that this spans human wait time too (approvals, manual testing, review turnaround) — not just active engineering time — so it isn't misread as pure implementation effort.
3. Write `reports/<YYYY-MM-DD>-<slug>.md` containing:
   - **Overview of requirements** — from `requirement_text`
   - **Overview of solution** — from `solution_text`
   - **Bugs raised** — grouped by category, each with opened/closed timestamps and resolution summary
   - **Time taken** — total, with the human-wait-time caveat above
4. This is a docs-only artifact, not a new product change, so it doesn't need to go through the full pipeline again. Land it directly:
   - `git checkout -b docs/report-<slug> main`
   - commit the report file
   - `git push -u origin docs/report-<slug>` (the `pre-push` hook allows this — it only hard-blocks pushes to `main` itself)
   - `gh pr create --title "Add post-deploy report for <change>" --body "..."`
   - wait for CI, then `gh pr merge <n> --squash --delete-branch`
5. `node scripts/workflow-state.mjs reset` — the workflow is complete; the next change request starts a fresh one at `requirement-analysis`.
