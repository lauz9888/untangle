# Change report: Fix post-deploy report committed to wrong branch in worktree context

**Commit**: [`dd31cfc`](https://github.com/lauz9888/untangle/commit/dd31cfc) · **Merged**: 2026-05-19 · **Cycle time**: 3m

## What changed

Step 5 of `.claude/skills/post-deploy-report.md` was rewritten to commit the report from the worktree rather than the main repo root. The `cd $project_root`, `git fetch origin main`, and `git checkout main -- .` commands were removed. The push now uses `git push origin HEAD:main`, and a QA approval marker write was added before the push step to satisfy the pre-push hook.

## Why

The previous step 5 tried to operate in the main repo root, which is typically checked out to a different branch (e.g. `docs/pwa-readme-and-wiki`). This caused report commits to land on the wrong branch, requiring manual cherry-picking to get them onto main. Since the worktree HEAD is already at the tip of main after the deploy push, committing from the worktree directly is the correct approach.

## Bug analysis

No bugs were raised during this change.
