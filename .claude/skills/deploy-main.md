---
name: deploy-main
description: Step 13 of the dev pipeline. Merges the PR once CI is green, syncs the wiki, and cleans up the branch/worktree.
---

Step 13 of the pipeline in `CLAUDE.md`. Runs once `deploy-branch` reports all 9 CI jobs green.

## Steps

1. Merge the PR: `gh pr merge <fields.pr_number> --squash --delete-branch`.
2. Invoke `wiki-update` via the Skill tool to sync the GitHub wiki against what just merged.
3. Remove the local worktree for this branch if one was used (`git worktree remove --force <path>`).
4. `node scripts/workflow-state.mjs approve deploy_main`
5. Invoke `post-deploy-report` via the Skill tool.

The change is now live for anyone installing the PWA from `main`.
