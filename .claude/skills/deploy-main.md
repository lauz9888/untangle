Push the change directly to main and confirm CI passes.

This skill is part of the automated development workflow. It is the default deployment path for small and medium changes. For larger changes where you want browser verification before merging, use `/deploy-branch` instead.

Changes are pushed directly to main. GitHub CI runs after the push via the `push: branches: [main]` trigger in `main.yml`. If CI fails, the failure lands on main — fix it with a follow-up commit.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`docs_done` must be true before proceeding.

### 2. Run local CI checks

Run these in order before pushing. They match what `main.yml` requires, so failures here prevent CI failures on main.

Determine the project root for npm commands (handles worktrees):
```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

**Lint and format:**
```
cd $project_root && npm run lint && npm run format:check
```

**Build:**
```
cd $project_root && npm run build
```

**Unit tests:**
```
cd $project_root && npm test -- --run
```

**E2E tests:**
```
cd $project_root && npm run test:e2e
```

For any test failure, trigger `/report-bug` before fixing — use `ci-unit-tests` or `ci-e2e-tests` as the source. Fix the issue, re-run the affected tests to confirm they pass, then close the issue.

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

Write the approval marker so the pre-push hook allows the push:

```
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | tr '/\\' '_')
mkdir -p "${git_dir}/claude-qa"
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

### 5. Push directly to main

```
git push origin HEAD:main
```

### 6. Watch CI

Get the run ID for the push just triggered and watch it:

```
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <run-id>
```

If CI fails, do not open a duplicate bug issue — `main.yml` already does that automatically. Investigate the failure, push a fix commit (`git push origin HEAD:main` again), then watch the new run.

### 7. Update the wiki

Run `/wiki-update` to review the change against the wiki and update any pages that are out of date. This runs through the developer's local Claude session.

### 8. Generate the post-deploy report

Once CI passes, run `/post-deploy-report` passing the merge commit SHA or the short commit reference. This generates a markdown report in `reports/` and commits it to main. The report reads `started_at` from current workflow state to compute cycle time, so it must run before the state is reset.

For the PR number field, use the commit SHA short form (e.g. `abc1234`) if there is no PR number — the report skill accepts either.

If report generation fails for any reason, log a warning to the developer but do not treat it as a deploy failure — the push has already completed successfully.

### 9. Reset workflow state

```
node scripts/workflow-state.mjs reset
```

### 10. Report to the developer

Tell the developer:
- That the change has been pushed to main and CI passed
- The report filename that was committed to `reports/`
- The full workflow is complete

### 11. Clean up the local worktree and branch

Capture the current worktree path and branch, then remove them. This is the last action in the session — the directory will be gone afterwards.

```bash
worktree_path=$(git rev-parse --show-toplevel)
branch=$(git rev-parse --abbrev-ref HEAD)
git_dir=$(git rev-parse --git-dir)

if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  main_root=$(cd "${git_dir}/${common}/.." && pwd)
  cd "$main_root"
  git push origin --delete "$branch" 2>/dev/null || true
  git worktree remove "$worktree_path" --force
  git branch -d "$branch" 2>/dev/null || git branch -D "$branch"
fi
```

If not in a worktree (no `commondir` file), skip silently — there is nothing local to clean up.
