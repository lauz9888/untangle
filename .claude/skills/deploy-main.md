Push the change directly to main and confirm CI passes.

This skill is part of the automated development workflow. It is the default deployment path for small and medium changes. For larger changes where you want browser verification before merging, use `/deploy-branch` instead.

Changes are pushed directly to main. GitHub CI runs after the push via the `push: branches: [main]` trigger in `ci.yml`. If CI fails, the failure lands on main — fix it with a follow-up commit.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`docs_done` must be true before proceeding.

### 2. Stage and commit all changes (if not already committed)

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

### 3. Write the QA approval marker

Write the approval marker so the pre-push hook allows the push:

```
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | tr '/\\' '_')
mkdir -p "${git_dir}/claude-qa"
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

### 4. Push directly to main

```
git push origin HEAD:main
```

### 5. Watch CI

Get the run ID for the push just triggered and watch it:

```
gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch <run-id>
```

If CI fails, do not open a duplicate bug issue — `ci.yml` already does that automatically. Investigate the failure, push a fix commit (`git push origin HEAD:main` again), then watch the new run.

### 6. Generate the post-deploy report

Once CI passes, run `/post-deploy-report` passing the merge commit SHA or the short commit reference. This generates a markdown report in `reports/` and commits it to main. The report reads `started_at` from current workflow state to compute cycle time, so it must run before the state is reset.

For the PR number field, use the commit SHA short form (e.g. `abc1234`) if there is no PR number — the report skill accepts either.

If report generation fails for any reason, log a warning to the developer but do not treat it as a deploy failure — the push has already completed successfully.

### 7. Reset workflow state

```
node scripts/workflow-state.mjs reset
```

### 8. Report to the developer

Tell the developer:
- That the change has been pushed to main and CI passed
- The report filename that was committed to `reports/`
- The full workflow is complete

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
