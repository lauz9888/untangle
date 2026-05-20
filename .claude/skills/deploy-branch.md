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

### 2. Stage and commit all changes

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

### 3. Write the QA approval marker

Write the approval marker so the pre-push hook allows the push:

```bash
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | tr '/\\' '_')
mkdir -p "${git_dir}/claude-qa"
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

### 4. Push to the branch

```
git push -u origin HEAD
```

Confirm the current branch name:

```
git branch --show-current
```

### 5. Start the dev server and open the browser

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

### 6. Watch GitHub Actions CI

Get the run ID for the push just made:

```powershell
$branch = git branch --show-current
$runId = (gh run list --branch $branch --limit 1 --json databaseId | ConvertFrom-Json)[0].databaseId
```

Poll until the run completes (check every 30 seconds, timeout after 15 minutes):

```powershell
$deadline = (Get-Date).AddMinutes(15)
$conclusion = $null
while ((Get-Date) -lt $deadline) {
    $run = (gh run list --branch $branch --limit 1 --json status,conclusion | ConvertFrom-Json)[0]
    if ($run.status -eq 'completed') {
        $conclusion = $run.conclusion
        break
    }
    Start-Sleep -Seconds 30
}
```

If the run failed, check for bug issues raised by the CI pipeline for this branch:

```powershell
$ciBugs = @()
if ($conclusion -ne 'success') {
    $ciBugs += gh issue list --label "ci-unit-tests" --state open --json number,title,body |
        ConvertFrom-Json | Where-Object { $_.title -like "*$branch*" }
    $ciBugs += gh issue list --label "ci-e2e-tests" --state open --json number,title,body |
        ConvertFrom-Json | Where-Object { $_.title -like "*$branch*" }
}
```

### 7. Report to the developer

Tell the developer:
- The branch name and that it's been pushed
- If `$serverReady` was `$true`: "The dev server is running — your browser has been opened to `http://localhost:5174` automatically."
  If `$serverReady` was `$false`: "The dev server didn't respond within 60 seconds — open `http://localhost:5174` manually once it's ready."
- The GitHub Actions CI result:
  - If passed: "All CI checks passed."
  - If failed and `$ciBugs` is non-empty: list each bug with its issue number, title, and a brief summary from the body. Ask: "CI raised the above bugs — would you like me to fix them now, or leave them on the backlog?"
  - If failed and `$ciBugs` is empty: "CI failed but no bug issues were raised — check the [Actions run](https://github.com/lauz9888/untangle/actions) for details."

Then ask:

> "The branch is ready for manual testing. Once you've tested, let me know when you're happy and I'll run `/deploy-main` to merge to main."

### 8. Wait

Do not advance the workflow automatically from here. The developer will trigger `/deploy-main` when they're ready.

If the developer asks to fix CI bugs, follow the CI bug fix process in step 9.

### 9. Handle bugs found after branch deploy

**CI bugs (raised by GitHub Actions):** If the developer asks to fix a CI bug:

1. Fix the bug.
2. Close the issue: `node scripts/bug-tracker.mjs close --title "<issue title>"`.
3. Commit the fix and push to the branch.
4. Return to step 6 — watch the new CI run.
5. Return to step 7 — report updated results to the developer.

**Manual testing bugs (reported by the developer):** If the developer reports a problem found while testing the branch, treat it as a bug found during manual testing — even if it looks minor or was introduced by this change. Before fixing anything:

1. Trigger `/report-bug` with source `manual`. Provide a concise title and description of what the developer observed.
2. Fix the bug.
3. Close the issue via `/report-bug` (the close step).
4. Commit the fix and push to the branch.
5. Return to step 6 — watch the new CI run.
6. Return to step 7 — report the updated branch to the developer and ask them to re-test.
