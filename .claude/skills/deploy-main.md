Run the full CI pipeline and deploy the change to main.

This skill is part of the automated development workflow. It runs automatically when the developer chooses to skip branch testing, or is triggered manually with `/deploy-main` after branch testing.

GitHub CI is the gate — all four required checks (Unit tests, E2E tests, Coverage gate, Build check) must pass before the merge executes. This relies on branch protection requiring those checks on main; if branch protection is ever removed, `--auto` will merge immediately without waiting.

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

### 4. Push and create a pull request

Push the branch, then create the PR:

```
git push -u origin <branch>

gh pr create \
  --title "<concise title of the change>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [x] Unit tests: run by GitHub CI
- [x] E2E tests: run by GitHub CI
- [x] Coverage gate: run by GitHub CI
- [x] Build check: run by GitHub CI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5. Queue the merge and wait for CI

Enable auto-merge so GitHub merges the PR once all required checks pass:

```
gh pr merge <PR-number> --squash --delete-branch --auto
```

Then watch CI progress until the merge completes:

```
gh pr checks <PR-number> --watch
```

If any check fails, GitHub CI will have already opened a bug issue via `ci.yml`. Do not re-open a duplicate. Investigate the failure, push a fix commit to the branch, and the auto-merge will re-queue automatically once checks pass.

### 6. Generate the post-deploy report

Once `gh pr checks` exits (merge complete), run `/post-deploy-report` passing the PR number. This generates a markdown report in `reports/` and commits it to main. The report reads `started_at` from current workflow state to compute cycle time, so it must run before the state is reset.

If report generation fails for any reason, log a warning to the developer but do not treat it as a deploy failure — the merge has already completed successfully.

### 7. Reset workflow state

```
node scripts/workflow-state.mjs reset
```

### 8. Report to the developer

Tell the developer:
- The PR number and that it has been merged to main
- The source branch has been deleted
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
