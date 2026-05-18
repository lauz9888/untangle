Run CI checks and deploy the change to a branch for manual testing.

This skill is part of the automated development workflow. It runs automatically when the developer chooses to test manually after document-analysis, or can be invoked manually with `/deploy-branch`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`docs_done` must be true before proceeding.

Determine the project root for running npm commands (handles worktrees):

```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

### 2. Run CI checks in order

Run each check individually. Fix any failures before continuing to the next check.

**Build check:**
```
cd $project_root && npm run build
```

**Unit tests (full suite):**
```
cd $project_root && npm test -- --run
```

**E2E tests (full suite):**
```
cd $project_root && npm run test:e2e
```

For each test failure (excluding CI infrastructure issues such as network errors or missing environment dependencies), trigger `/report-bug` before fixing — use source `ci-unit-tests` for unit test failures or `ci-e2e-tests` for e2e failures. Provide the failure message and location. After the fix is confirmed passing, explicitly run the close step (`bug-tracker.mjs close`) before continuing — do not leave the issue open. If the fix cannot be made inline and requires its own PR, include `Closes #N` in that PR's commit message or body, then run `bug-tracker.mjs close` after the PR merges.

### 3. Stage and commit all changes

Review what will be committed:

```
git diff --stat
git status
```

Commit the full change (implementation + tests + docs):

```
git add <specific files — not git add -A>
git commit -m "<summary of what was implemented>

<brief details if needed>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 4. Push to the branch

```
git push -u origin HEAD
```

Confirm the current branch name:

```
git branch --show-current
```

### 5. Report to the developer

Tell the developer:
- The branch name and that it's been pushed
- How to access this version locally: the worktree is already checked out at `.claude/worktrees/<worktree-name>`. Run `npm run dev` from there — `vite.config.js` auto-detects the worktree and serves on port 5174, leaving the main server on 5173 undisturbed. Navigate to `http://localhost:5174` to test
- All CI checks passed

Then ask:

> "The branch is ready for manual testing. Once you've tested, let me know when you're happy and I'll run `/deploy-main` to merge to main."

### 6. Wait

Do not advance the workflow automatically from here. The developer will trigger `/deploy-main` when they're ready.

### 7. Handle bugs reported during manual testing

If the developer reports a problem found while testing the branch, treat it as a bug found during manual testing — even if it looks minor or was introduced by this change. Before fixing anything:

1. Trigger `/report-bug` with source `manual`. Provide a concise title and description of what the developer observed.
2. Fix the bug.
3. Close the issue via `/report-bug` (the close step).
4. Commit the fix and push to the branch.
5. Re-run the full CI suite (step 2) to confirm nothing regressed.
6. Return to step 5 — report the updated branch to the developer and ask them to re-test.
