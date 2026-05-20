Merge the feature branch into main and confirm CI passes.

This skill is part of the automated development workflow. It runs after the developer has signed off on the branch (from `/deploy-branch`), or automatically for doc-only changes.

Changes are merged into main via a GitHub PR. CI runs after the merge via the `push: branches: [main]` trigger in `main.yml`. If CI fails after merge, fix it with a follow-up commit on main.

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

### 5. Merge the feature branch into main via a PR

Confirm the current branch is not `main` before proceeding:

```powershell
$branch = git branch --show-current
if ($branch -eq 'main') {
    Write-Error "Already on main — nothing to merge. Changes must be on a feature branch."
    exit 1
}
```

Push the feature branch (picks up any new commits since deploy-branch; safe to run even if already up to date):

```
git push -u origin HEAD
```

Check whether a PR already exists for this branch; create one if not:

```powershell
$branch = git branch --show-current
$existing = gh pr list --head $branch --base main --json number | ConvertFrom-Json
if ($existing.Count -gt 0) {
    $prNumber = $existing[0].number
} else {
    $title = git log -1 --pretty=%s
    $prUrl = gh pr create --base main --head $branch --title $title --body "Merged via /deploy-main."
    $prNumber = ($prUrl -split '/')[-1]
}
```

Merge the PR:

```
gh pr merge $prNumber --merge
```

### 6. Watch CI

Wait a few seconds for GitHub to register the merge, then get the run ID and watch it:

```powershell
Start-Sleep -Seconds 10
$runId = (gh run list --branch main --limit 1 --json databaseId | ConvertFrom-Json)[0].databaseId
gh run watch $runId
```

If CI fails, do not open a duplicate bug issue — `main.yml` already does that automatically. Investigate the failure, fix it on the feature branch, push (`git push origin HEAD`), and open a follow-up PR to main. Then watch the new run.

### 7. Update the wiki

Run `/wiki-update` to review the change against the wiki and update any pages that are out of date. This runs through the developer's local Claude session.

### 8. Generate the post-deploy report

Once CI passes, run `/post-deploy-report` passing the merge commit SHA or the short commit reference. This generates a markdown report in `reports/` and commits it to main. The report reads `started_at` from current workflow state to compute cycle time, so it must run before the state is reset.

Use `$prNumber` from step 5 as the PR number. If for any reason the PR number is unavailable, use the merge commit SHA short form (e.g. `abc1234`) — the report skill accepts either.

If report generation fails for any reason, log a warning to the developer but do not treat it as a deploy failure — the push has already completed successfully.

### 9. Reset workflow state

```
node scripts/workflow-state.mjs reset
```

### 10. Report to the developer

Tell the developer:
- That the feature branch was merged into main and CI passed
- The PR number and the report filename that was committed to `reports/`
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
