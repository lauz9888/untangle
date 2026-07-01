---
name: unit-test-analysis
description: Step 4 of the dev pipeline (TDD red phase). Adds, updates, and removes Vitest unit tests to reflect the approved requirement and solution design, before any implementation exists.
---

Step 4 of the pipeline in `CLAUDE.md` — this is the TDD "red" phase. **Do not write or change implementation code in this skill.** Only tests.

## Steps

1. Read `fields.requirement_text` and `fields.solution_text` (or `fields.unit_test_review_feedback` if looping back from `unit-test-review`).
2. Follow the pairing convention in `tests/unit/<feature>/`:
   - `composable.test.js` — resets the module between tests (`vi.resetModules()`) for fresh state
   - `components.test.js` — mocks the composable entirely (`vi.mock(...)`) to isolate rendering
   - Don't mix the two styles in one file.
3. Write tests that exercise every behavior implied by the requirement and design — including edge cases. These tests describe the spec; they will fail until `solution-implementation` runs.
4. Remove or update any existing tests that the design makes obsolete or incorrect.
5. `node scripts/workflow-state.mjs approve unit_test_write`
6. Invoke `unit-test-review` via the Skill tool.
