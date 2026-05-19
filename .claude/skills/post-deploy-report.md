Generate a post-deployment report for the change that was just merged to main.

This skill is part of the automated development workflow. It runs automatically at the end of `/deploy-main`, or can be invoked manually with `/post-deploy-report <PR-number>`.

## Steps

### 1. Gather workflow state and inputs

Read the current workflow state (may already be reset — that is fine, use what is available):

```
node scripts/workflow-state.mjs get
```

Note the `started_at` field — this is when the requirement was first captured. If the workflow was reset before this skill ran, `started_at` may be absent; in that case the cycle time will be omitted from the report.

The PR number must be provided — either passed as an argument or taken from the deploy-main context. If it is not available, ask the developer for it before continuing.

Determine the project root (handles worktrees):

```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

### 2. Fetch PR details from GitHub

```
gh pr view <PR-number> --json number,title,url,mergedAt,mergeCommit,body,author
```

Compute the cycle time using `started_at` (from workflow state) and `mergedAt` (from the PR). Format it as:
- `Xm` if under 1 hour (e.g. `42m`)
- `Xh Ym` if under 24 hours (e.g. `2h 7m`)
- `Xd Yh` if 1 day or more (e.g. `1d 3h`)

If `started_at` is absent, set cycle time to `null` and omit it from the report.

Also fetch the list of commits on the PR to find `Fixes #N` / `Closes #N` / `Resolves #N` references:

```
gh pr view <PR-number> --json commits --jq '.commits[].messageHeadline'
```

Extract all issue numbers referenced in commit messages and the PR body using the patterns `Fixes #N`, `Closes #N`, `Resolves #N`.

### 3. Fetch bug issues linked to this change

Fetch details for each referenced issue number:

```
gh issue view <N> --json number,title,state,labels,body,closedAt
```

Also search for any open or recently closed issues whose labels include `found:development`, `found:qa`, `found:ci`, or `found:manual`, cross-referenced against the PR merge date to catch issues that were raised and closed during this workflow but not referenced via `Fixes #N`:

```
gh issue list --state closed --label bug --json number,title,labels,body,closedAt \
  --jq '[.[] | select(.closedAt >= "<merge-date-minus-7-days>")]'
```

Read the `**Detected by:**` field in each issue body to determine which workflow stage found it.

### 4. Write the report

Determine the report filename:
- Date: the PR merge date in `YYYY-MM-DD` format
- Slug: PR title lowercased, non-alphanumeric characters replaced with hyphens, truncated to 40 characters, trailing hyphens removed

```
reports/YYYY-MM-DD-pr-<N>-<slug>.md
```

Write the report with this structure:

```markdown
# Change report: <PR title>

**PR**: [#N](<PR URL>) · **Merged**: <merge date> · **Commit**: [`<short SHA>`](<commit URL>) · **Cycle time**: <cycle time (omit this field entirely if started_at was absent)>

## What changed

<2–4 sentences drawn from the requirement_text and implementation_summary: what the change does and what files it touched.>

## Why

<1–2 sentences drawn from the requirement_text GOAL field: the problem this change solves.>

## Bug analysis

<If no bugs were raised:>
No bugs were raised during this change.

<If bugs were raised:>
**N bug(s) raised** across this change.

| # | Title | Detected at | Status |
|---|---|---|---|
| [#N](<issue URL>) | <title> | <stage> | Fixed before merge / Fixed after merge / Open |

**Analysis**: <2–4 sentences of genuine analysis — not just a restatement of the table. Cover: which stages bugs were caught at and what that implies about the process (e.g. "Both bugs were caught during manual testing rather than automated checks, suggesting the automated suite does not cover visual layout at mobile viewports."); whether any bugs slipped later than expected; any pattern in bug type (visual, logic, performance, etc.); and a one-sentence verdict on the quality signal this change sends.>
```

### 5. Commit the report to main

The report is committed from the worktree, which is already at the tip of main after the deploy push. Write the report file to `reports/<filename>.md` inside the worktree, then commit and push:

```
git add reports/<filename>.md
git commit -m "Add post-deploy report for <ref>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD:main
```

Do not cd to `project_root` or use `git checkout main` — the main branch is checked out in another worktree and those commands will fail or commit to the wrong branch.

Write the QA approval marker for the new commit before pushing (the pre-push hook requires it):

```
git_dir=$(git rev-parse --git-dir)
branch=$(git branch --show-current)
safe_branch=$(echo "$branch" | sed 's|[/\\]|_|g')
git rev-parse HEAD > "${git_dir}/claude-qa/${safe_branch}.approved"
```

If the commit or push fails, save the report content and tell the developer: "Report generated but could not be committed automatically. Here is the content — save it to `reports/<filename>.md` and commit manually."

### 6. Confirm to the developer

Tell the developer:
- The report filename and that it has been committed to main
- A one-line summary of the bug analysis verdict
- That past reports can be found in the `reports/` directory
