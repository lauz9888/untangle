---
name: solution-implementation
description: Step 6 of the dev pipeline. Creates a branch off main and implements the solution design, iterating until all unit tests pass. Also the fix-and-resume point for every downstream loop-back (refactor, e2e, manual testing, CI).
---

Step 6 of the pipeline in `CLAUDE.md`. This skill has two entry modes — check `node scripts/workflow-state.mjs get` first to tell which one you're in.

## Mode A — forward pass (normal entry from unit-test-review)

`fields.resume_after_fix` is unset.

1. If `fields.branch` is unset, create a branch off `main` (name it `<type>/<short-slug>` from the requirement, e.g. `feat/energy-filter`) and record it: `node scripts/workflow-state.mjs set branch <name>`.
2. Implement exactly what `fields.solution_text` describes, following `CLAUDE.md` conventions (composables own logic, thin components, singleton pattern for shared state).
3. Run `npm test -- run`. Fix the **code**, not the tests — the tests written in steps 4–5 are the spec. Loop internally until green.
4. Log anything nontrivial you had to work around: `node scripts/bug-tracker.mjs create implementation "<title>" "<what/why>"`, close it once resolved.
5. On green: `node scripts/workflow-state.mjs approve implementation`, invoke `solution-refactor`.

## Mode B — fix-and-resume (loop-back entry)

`fields.resume_after_fix` is set to the stage that looped back here (`refactor`, `e2e_execution`, `manual_testing`, or `deploy_branch`), and `fields.loopback_reason` describes the bug.

1. Fix the specific issue described in the reason — don't do unrelated cleanup here, that's refactor's job.
2. Run the narrowest relevant check first (`npm test -- run` always; add `npm run test:e2e` if the loop-back came from an e2e/manual/CI stage) to confirm the fix.
3. Commit the fix.
4. Read `resume_after_fix`, then clear it: `node scripts/workflow-state.mjs set resume_after_fix ""`.
5. Invoke the skill matching that stage again via the Skill tool (`solution-refactor`, `e2e-test-execution`, `manual-testing`, or `deploy-branch`) — do **not** fall through to the normal forward sequence.
