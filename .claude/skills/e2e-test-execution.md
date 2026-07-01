---
name: e2e-test-execution
description: Step 10 of the dev pipeline. Runs the full e2e suite for real against the implemented change; failures are logged as e2e bugs and routed back to solution-implementation.
---

Step 10 of the pipeline in `CLAUDE.md`. Runs after `e2e-test-review` confirms the red phase.

## Steps

1. Run `npm run test:e2e` (the full suite, not just the changed specs — catches regressions elsewhere).
2. **On failure**:
   - `node scripts/bug-tracker.mjs create e2e "<title>" "<what failed and why>"`
   - `node scripts/workflow-state.mjs set resume_after_fix e2e_execution`
   - `node scripts/workflow-state.mjs set loopback_reason "<summary>"`
   - `node scripts/workflow-state.mjs loopback implementation "<reason>"`
   - Invoke `solution-implementation` via the Skill tool.
   - Close the bug once the suite passes on the next run.
3. **On success**:
   - `node scripts/workflow-state.mjs approve e2e_execution`
   - Invoke `manual-testing` via the Skill tool.
