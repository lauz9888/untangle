---
name: deploy-branch
description: Step 12 of the dev pipeline. Pushes the branch, opens a PR, waits for the 9-job CI pipeline, and routes any failing job back to solution-implementation for a fix.
---

Step 12 of the pipeline in `CLAUDE.md`. Runs after `manual-testing` is confirmed complete (or not required).

## Steps

1. Push the branch: `git push -u origin <fields.branch>`. The `pre-push` hook will block a direct push to `main` and verify unit/e2e/manual sign-off timestamps are present — if it rejects the push, something earlier in the pipeline was skipped; go back and complete it rather than bypassing the hook.
2. Open a PR if one doesn't exist yet: `gh pr create --title "<short summary>" --body "<requirement + solution summary>"`. Record it: `node scripts/workflow-state.mjs set pr_number <n>`.
3. Wait for CI: `gh pr checks <n> --watch`.
4. **On any job failure**, map the job name to its bug category and log it:

   | CI job              | Category        |
   | ------------------- | --------------- |
   | Lint                | `ci-lint`       |
   | Build               | `ci-build`      |
   | Unit tests          | `ci-unit-tests` |
   | Coverage gate       | `ci-coverage`   |
   | E2E tests           | `ci-e2e`        |
   | Accessibility tests | `ci-a11y`       |
   | Security audit      | `ci-security`   |
   | PWA validation      | `ci-pwa`        |
   | Documentation check | `ci-docs`       |
   - `node scripts/bug-tracker.mjs create <category> "<title>" "<CI failure detail>"`
   - `node scripts/workflow-state.mjs set resume_after_fix deploy_branch`
   - `node scripts/workflow-state.mjs set loopback_reason "<summary>"`
   - `node scripts/workflow-state.mjs loopback implementation "<reason>"`
   - Invoke `solution-implementation` via the Skill tool — it will fix, commit, and hand back here to re-push and re-check CI.
   - Close each bug once its job passes on the next CI run.

5. **Once all 9 jobs are green**:
   - `node scripts/workflow-state.mjs approve deploy_branch`
   - Invoke `deploy-main` via the Skill tool.
