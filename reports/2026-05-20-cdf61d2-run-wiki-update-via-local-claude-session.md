# Change report: Run wiki update via local Claude session instead of GitHub Actions

**PR**: `cdf61d2` · **Merged**: 2026-05-20 · **Commit**: [`cdf61d2`](https://github.com/lauz9888/untangle/commit/cdf61d29da2e7a88326f5df18d56d18e532d17c6)

## What changed

Deleted `.github/workflows/wiki-update.yml`, which was the GitHub Actions job that ran the wiki update on every push to main. Added a `/wiki-update` invocation step (step 7) to `.claude/skills/deploy-main.md` so the wiki update now runs through the developer's local Claude Code session after CI passes. Updated `CLAUDE.md` to document the new approach, and updated the wiki's `Developer-Workflow.md` to remove references to the deleted workflow.

## Why

The wiki update was designed to run via the developer's Claude session, which already has API access. Running it as a GitHub Actions job required an `ANTHROPIC_API_KEY` repository secret that was never set, causing the job to fail on every push to main.

## Bug analysis

No bugs were raised during this change.
