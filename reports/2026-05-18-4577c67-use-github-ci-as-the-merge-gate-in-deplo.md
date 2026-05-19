# Change report: Use GitHub CI as the merge gate in deploy-main

**Commit**: [`4577c67`](https://github.com/lauz9888/untangle/commit/4577c678612ed50280af72376ab4ad1a0c10bbcf) · **Pushed**: 2026-05-18 · **Cycle time**: 8m

## What changed

Rewrote `.claude/skills/deploy-main.md` to remove the local build, unit test, and e2e test steps. The skill now commits, writes the QA marker, pushes directly to `main` via `git push origin HEAD:main`, and watches the GitHub Actions run to confirm CI passes. Also enabled repository auto-merge and branch protection on main with all four CI jobs (Unit tests, E2E tests, Coverage gate, Build check) as required status checks.

## Why

The previous skill ran all checks locally, then created a PR and merged it immediately — meaning GitHub CI only validated the merge commit post-hoc rather than gating it. Removing the local checks eliminates the duplication and makes GitHub CI the single source of truth. The PR flow is preserved in `/deploy-branch` for changes that need browser verification before merging.

## Bug analysis

No bugs were raised during this change.
