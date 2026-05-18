Run the full CI pipeline and deploy the change to main.

This skill is part of the automated development workflow. It is the default deployment path — triggered automatically when no manual browser testing is needed, or manually with `/deploy-main` after branch testing is complete.

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

Run each check individually. Fix any failures before continuing.

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

### 3. Stage and commit all changes (if not already committed)

Check whether the changes have been committed:

```
git status
git log --oneline main...HEAD
```

If there are uncommitted changes, commit them:

```
git add <specific files>
git commit -m "<summary>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### 4. Write the QA approval marker

All CI checks have passed. Write the approval marker so the pre-push hook allows the push:

```
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | tr '/\\' '_')
mkdir -p "${git_dir}/claude-qa"
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

### 5. Create a pull request and merge

Create the PR:

```
gh pr create \
  --title "<concise title of the change>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [x] Unit tests updated and passing
- [x] E2E tests updated and passing
- [x] Build passes
- [x] Documentation updated

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Get the PR number from the output, then merge:

```
gh pr merge <PR-number> --squash --delete-branch
```

### 6. Generate the post-deploy report

Run `/post-deploy-report` passing the PR number from step 5. This generates a markdown report in `reports/` and commits it to main. The report reads `started_at` from current workflow state to compute cycle time, so it must run before the state is reset.

If report generation fails for any reason, log a warning to the developer but do not treat it as a deploy failure — the merge has already completed successfully.

### 7. Reset workflow state

```
node scripts/workflow-state.mjs reset
```

### 8. Report to the developer

Tell the developer:
- The PR number and that it has been merged to main
- The source branch has been deleted from the remote
- The report filename that was committed to `reports/`
- That the local worktree and branch are about to be removed

If the wiki auto-update workflow is running, mention that it will update the GitHub wiki automatically.

### 9. Clean up the local worktree and branch

Capture the current worktree path and branch, then remove them. This is the last action in the session — the directory will be gone afterwards.

```bash
worktree_path=$(git rev-parse --show-toplevel)
branch=$(git rev-parse --abbrev-ref HEAD)
git_dir=$(git rev-parse --git-dir)

if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  main_root=$(cd "${git_dir}/${common}/.." && pwd)
  cd "$main_root"
  git worktree remove "$worktree_path" --force
  git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
fi
```

If not in a worktree (no `commondir` file), skip silently — there is nothing local to clean up.
