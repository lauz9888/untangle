# Change report: Add worktree and branch cleanup as final workflow step

**PR**: [#51](https://github.com/lauz9888/untangle/pull/51) · **Merged**: 2026-05-18 · **Commit**: [`63b92c4`](https://github.com/lauz9888/untangle/commit/63b92c4c28d874ed5082fd592f6b3bb170f14dbc) · **Cycle time**: 9m

## What changed

Added a new step 9 to `.claude/skills/deploy-main.md` that runs after the developer report: it detects whether the current session is running inside a git worktree (via the presence of a `commondir` file), then navigates to the main repo and removes the worktree directory with `git worktree remove --force` and deletes the local branch ref. Updated `CLAUDE.md` to add a step 10 row to the workflow table documenting the cleanup.

## Why

After each automated deployment the local git worktree and branch were left behind, requiring manual cleanup. This change makes the workflow fully self-contained — the repo and local filesystem stay tidy with no post-deploy housekeeping needed.

## Bug analysis

No bugs were raised during this change.
