---
name: solution-design
description: Step 2 of the dev pipeline. Designs the implementation approach for the approved requirement.
---

Step 2 of the pipeline in `CLAUDE.md`. Runs after `requirement-analysis`, or is re-run by `solution-review` when it loops back with feedback.

## Steps

1. `node scripts/workflow-state.mjs get` — read `fields.requirement_text`, and if this is a loop-back, `fields.solution_review_feedback`.
2. Explore the existing codebase for reusable patterns before proposing anything new: composables in `src/composables/`, existing components, existing tests. Prefer extending what's there over introducing parallel structures.
3. Produce a concrete design covering:
   - Files to add/change (composables, components, tests)
   - Data flow and where state/logic lives (business logic belongs in composables, components stay thin — per `CLAUDE.md`)
   - Edge cases the requirement implies
   - Any new dependencies — must be open source; note the license
4. If this is a loop-back from `solution-review`, address every point in `solution_review_feedback` explicitly — don't just tweak unrelated things.
5. `node scripts/workflow-state.mjs set solution_text "<design>"`
6. `node scripts/workflow-state.mjs approve solution_design`
7. Invoke `solution-review` via the Skill tool.
