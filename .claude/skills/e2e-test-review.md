---
name: e2e-test-review
description: Step 9 of the dev pipeline. Cross-checks e2e coverage against requirements/design, signs off, then confirms the new specs fail before the change is implemented against them.
---

Step 9 of the pipeline in `CLAUDE.md`. Reviews the output of `e2e-test-analysis`.

## Coverage review

Compare `fields.requirement_text` / `fields.solution_text` against the specs written — does every user-facing flow in the requirement have coverage?

- If gaps: `node scripts/bug-tracker.mjs create e2e-test "<title>" "<what's missing>"`, `node scripts/workflow-state.mjs set e2e_test_review_feedback "<feedback>"`, `node scripts/workflow-state.mjs loopback e2e_test_write "<reason>"`, invoke `e2e-test-analysis`. Close the bug once addressed.

## Red-phase confirmation

1. Run the changed/added specs, e.g. `npx playwright test <changed spec path>`.
2. **Expect failures** — this is still pre-implementation-of-e2e-verification territory in spirit, though by this point `solution-implementation`/`solution-refactor` have already landed the unit-level behavior. If a changed/added spec unexpectedly passes with no real coverage exercised (e.g. it's asserting something trivially true), that's a test bug: `node scripts/bug-tracker.mjs create e2e-test "<title>" "spec doesn't exercise the change"`, loop back to `e2e-test-analysis`.
3. Once signed off:
   - `node scripts/workflow-state.mjs approve e2e_test_review`
   - Invoke `e2e-test-execution` via the Skill tool.
