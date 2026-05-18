# Change report: Clarify that branch deploy is only needed for manual testing

**PR**: [#66](https://github.com/lauz9888/untangle/pull/66) · **Merged**: 2026-05-18 · **Commit**: [`d92d18c`](https://github.com/lauz9888/untangle/commit/d92d18c651404d72f076284a83e5e2b27bc0aaf2) · **Cycle time**: 5h 21m

## What changed

Updated three documentation files to make clear that `/deploy-branch` is only needed when manual browser verification is required, and `/deploy-main` is the default deployment path. `CLAUDE.md`'s workflow table now labels step 8a as "only when manual testing is needed" and step 8b as the default. `document-analysis.md` reorders the deployment question to list deploy-main first with a *(default)* label and adds guidance on when each path is appropriate. `deploy-main.md`'s opening description now reflects its role as the default path rather than a fallback when branch testing is skipped.

## Why

The previous documentation presented both deployment paths with equal weight, which could lead developers to always go through branch deploy even when no browser verification was needed. The change clarifies the decision criteria so developers can route changes straight to main when appropriate.

## Bug analysis

No bugs were raised during this change.
