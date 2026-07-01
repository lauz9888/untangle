---
name: unit-test-review
description: Step 5 of the dev pipeline. Cross-checks unit test coverage against requirements/design, signs off, then confirms the new tests fail (TDD red phase) before implementation begins.
---

Step 5 of the pipeline in `CLAUDE.md`. Reviews the output of `unit-test-analysis`.

## Coverage review

Compare `fields.requirement_text` / `fields.solution_text` against the tests written. For every requirement and edge case, is there a test? Is anything over-mocked to the point it wouldn't catch a real regression?

- If gaps: `node scripts/bug-tracker.mjs create unit-test "<title>" "<what's missing>"`, `node scripts/workflow-state.mjs set unit_test_review_feedback "<feedback>"`, `node scripts/workflow-state.mjs loopback unit_test_write "<reason>"`, invoke `unit-test-analysis`. Close the bug once the next pass covers it.

## Red-phase confirmation

Once coverage is signed off:

1. Run `npm test -- run` (or scope to the changed/added test files).
2. **Expect the changed/added tests to fail** — nothing is implemented yet.
3. If any changed/added test unexpectedly **passes**, that test isn't actually exercising the unimplemented behavior — it's a bug in the test itself. `node scripts/bug-tracker.mjs create unit-test "<title>" "test passes without implementation"`, loop back to `unit-test-analysis` to fix it.
4. Once all changed/added tests fail as expected and nothing unrelated broke:
   - `node scripts/workflow-state.mjs approve unit_test_review`
   - Invoke `solution-implementation` via the Skill tool.
