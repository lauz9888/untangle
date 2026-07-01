---
name: solution-review
description: Step 3 of the dev pipeline. Reviews the solution design against requirements, codebase fit, best practice, testability, and open-source-only dependencies.
---

Step 3 of the pipeline in `CLAUDE.md`. Reviews the output of `solution-design`; loops back to it until satisfied.

## Review checklist

Read `fields.requirement_text` and `fields.solution_text` via `node scripts/workflow-state.mjs get`, then check:

1. **Coverage** — does the design address every requirement, including edge cases?
2. **Fit** — does it reuse existing composables/components/utilities where they already do the job, rather than duplicating logic?
3. **Efficiency** — is it a reasonable amount of work for the requirement, no unnecessary complexity or premature abstraction?
4. **Best practice** — consistent with the conventions in `CLAUDE.md` (composables own state/logic, thin components, singleton pattern where applicable)?
5. **Testability** — clear seams for unit tests (composable-level) and e2e tests (user-flow level)?
6. **Open source only** — any new dependency must be OSS with a permissive/compatible license. No proprietary or paid SaaS APIs.

## If gaps are found

- `node scripts/bug-tracker.mjs create design "<short title>" "<what's missing or wrong>"`
- `node scripts/workflow-state.mjs set solution_review_feedback "<specific, actionable feedback>"`
- `node scripts/workflow-state.mjs loopback solution_design "<one-line reason>"`
- Invoke `solution-design` via the Skill tool.
- Once the revised design addresses it, close the bug: `node scripts/bug-tracker.mjs close <number> "<resolution>"`.

## If satisfied

- `node scripts/workflow-state.mjs approve solution_review`
- Invoke `unit-test-analysis` via the Skill tool.
