---
name: manual-testing
description: Step 11 of the dev pipeline. Hands the user a local URL to manually test the change and waits for their explicit confirmation before proceeding to deploy.
---

Step 11 of the pipeline in `CLAUDE.md`. Runs after `e2e-test-execution` passes.

## Steps

1. Make sure the dev server is running (`npm run dev`, usually already up via the session hook) and give the user the link: `http://localhost:5173`.
2. Summarize what to test, drawn from `fields.requirement_text` — call out the specific flow(s) affected, not "test everything."
3. Ask the user to confirm the change works, or tell you it's not needed, or report what's broken. Wait for their response — do not proceed on your own.
4. **If the user reports a bug**:
   - `node scripts/bug-tracker.mjs create manual "<title>" "<what they saw>"`
   - `node scripts/workflow-state.mjs set resume_after_fix manual_testing`
   - `node scripts/workflow-state.mjs set loopback_reason "<summary>"`
   - `node scripts/workflow-state.mjs loopback implementation "<reason>"`
   - Invoke `solution-implementation` via the Skill tool.
   - Close the bug once the user confirms it's fixed on the next pass.
5. **If the user confirms it's complete, or says manual testing isn't required for this change**:
   - `node scripts/workflow-state.mjs approve manual_testing`
   - Invoke `deploy-branch` via the Skill tool.
