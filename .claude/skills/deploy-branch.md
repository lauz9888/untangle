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

### 4. Write the QA approval marker

Write the approval marker so the pre-push hook allows the push:

```bash
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | tr '/\\' '_')
mkdir -p "${git_dir}/claude-qa"
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

### 5. Push to the branch

```
git push -u origin HEAD
```

Confirm the current branch name:

```
git branch --show-current
```

### 6. Start the dev server and open the browser

Get the worktree path — the root of the directory Claude is currently working in (not the project root from step 1):

```bash
worktree=$(git rev-parse --show-toplevel)
```

Start `npm run dev` in a new terminal window so it stays running independently after the workflow completes. Via PowerShell:

```powershell
$worktree = git rev-parse --show-toplevel
Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location '$worktree'; npm run dev")
```

Poll `http://localhost:5174` every 2 seconds until it responds or 60 seconds elapse:

```powershell
$deadline = (Get-Date).AddSeconds(60)
$serverReady = $false
while ((Get-Date) -lt $deadline) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $serverReady = $true; break
    } catch { Start-Sleep -Seconds 2 }
}
```

If the server responded, open it in the browser:

```powershell
if ($serverReady) { Start-Process "http://localhost:5174" }
```

Note the value of `$serverReady` for the report in the next step.

### 7. Report to the developer

Tell the developer:
- The branch name and that it's been pushed
- If `$serverReady` was `$true`: "The dev server is running — your browser has been opened to `http://localhost:5174` automatically."
  If `$serverReady` was `$false`: "The dev server didn't respond within 60 seconds — open `http://localhost:5174` manually once it's ready."
- All CI checks passed

Then ask:

> "The branch is ready for manual testing. Once you've tested, let me know when you're happy and I'll run `/deploy-main` to merge to main."

### 8. Wait

Do not advance the workflow automatically from here. The developer will trigger `/deploy-main` when they're ready.

### 9. Handle bugs reported during manual testing

If the developer reports a problem found while testing the branch, treat it as a bug found during manual testing — even if it looks minor or was introduced by this change. Before fixing anything:

1. Trigger `/report-bug` with source `manual`. Provide a concise title and description of what the developer observed.
2. Fix the bug.
3. Close the issue via `/report-bug` (the close step).
4. Commit the fix and push to the branch.
5. Re-run the full CI suite (step 2) to confirm nothing regressed.
6. Return to step 7 — report the updated branch to the developer and ask them to re-test.
