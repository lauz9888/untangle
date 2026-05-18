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

For each test failure caused by a real source bug (not infrastructure), trigger `/report-bug` before fixing — use source `ci-unit-tests` for unit test failures or `ci-e2e-tests` for e2e failures. Provide the failure message and location. After the issue is created and the bug is fixed, re-run the failing suite to confirm it passes before continuing.

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
- How to access this version locally: `git checkout <branch>` then `npm run dev` (or provide a preview URL if one is generated)
- All CI checks passed

Then ask:

> "The branch is ready for manual testing. Once you've tested, let me know when you're happy and I'll run `/deploy-main` to merge to main."

### 6. Wait

Do not advance the workflow automatically from here. The developer will trigger `/deploy-main` when they're ready.
