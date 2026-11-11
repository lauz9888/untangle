```metrics
tracking_issue: 190
started_at: 2026-11-11T07:10:36Z
completed_at: 2026-11-11T08:04:47Z
total_hours: 0.9
coverage_percent: statements 97.02 (847/873), branches 95.61 (654/684)
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 48/48 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 6
  unit-test: 1
  bdd-test: 0
  e2e-test: 0
  storybook-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 0
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

# Post-change report: accurate-coverage-merge

Tracking issue #190, feature PR #198 (merge `f5d1764`).

## Requirements

Make the combined coverage figure from `scripts/merge-coverage.mjs` accurate. This is tooling and test-infra only, with no UI or `src/` change. The 25 requirements cover three areas.

- **e2e layer correctness:** confirm the root cause of the flat e2e layer, then fix it. The fixed layer needs non-uniform hit counts, function and branch data, no template/style/comment entries, and an unchanged production build.
- **Merge correctness:** each statement, branch and function counts once however many layers cover it. The merge must be deterministic and independent of layer order. Path normalisation and `/src/` scoping are kept.
- **Output, gating and guards:**
  - The script prints both statement and branch percentages.
  - The gate covers statements and branches, at 90% each.
  - Regression guards catch a flat e2e layer and a naive double-count.
  - A new ADR is added and the docs are updated.

## Solution

- **Root cause (confirmed):** the raw V8 entries did carry block-level data. `v8-to-istanbul` works at line granularity, and the minified bundle has only 19 physical lines. As a result, the whole-script `count 1` range was mapped onto every source line. Every `src/` file showed a single hit value and empty function and branch maps. It also produced statements for `<template>`/`<style>`/comment lines.
- **e2e fix:** the e2e build is now Istanbul-instrumented via `vite-plugin-istanbul` (only when `COVERAGE=true`), and `window.__coverage__` is read. It is remapped to original-source coordinates with `istanbul-lib-source-maps`. The production build is unchanged.
- **Merge:**
  - Pure merge logic lives in `scripts/lib/coverage-merge.mjs` with typed declarations.
  - Statements are taken from a single "universe" (unit + Storybook), and other layers are credited onto it. Unit + Storybook is the statement universe because they use the same AST-based instrumenter.
  - Branch arms are matched by index only when the arm counts are compatible.
  - Items from BDD/e2e-only layers that match nothing are tallied and reported as ignored.
- **Guards:** runtime assertions in the script, plus unit tests, cover a flat e2e layer, a missing e2e layer (which is fatal), universe completeness, and double-count detection.
- **Gate:** statements and branches are both gated at 90%. `ci.yml` and `.claude/STANDARDS.md` are updated. The decision is recorded in `docs/adr/0007-single-statement-universe-and-istanbul-e2e-for-combined-coverage.md`.

## Test changes

- Unit: `tests/unit/coverage-merge/merge.test.ts` covers synthetic per-layer maps with column offsets, merge-order independence, determinism, double-count regression, branch-arm mismatch and the guards. `tests/unit/coverage-merge/counters.test.ts` covers the counters. No WCAG scan, as there is no UI.
- BDD: none.
- e2e: none new. The e2e coverage fixture and global teardown were changed to use Istanbul. The base-path smoke check passed (#176).
- Storybook: none new. The existing suite ran 48/48 stories, 35 with play functions. This is the existing Storybook suite, not a layer this run changed.

## Accessibility

No UI-facing requirements. The requirements file has no accessibility requirements and the run touched no components. No issues carry the `accessibility` label.

## Bugs raised

Seven issues, all closed. Per-stage counts are in the metrics block.

**design** (all caught in solution review, all opened 2026-11-11T07:22:48Z-07:22:59Z and closed 07:26:49Z-07:26:59Z):

- #191: universe completeness was asserted, not verified. Resolved by adding a guard, printing ignored-item counts and documenting the `src/main.ts` exclusion.
- #192: the dedupe guard was too weak to catch a naive double-count. Resolved by tightening it and adding a regression test.
- #193: branch-arm index matching could mis-credit arms. Resolved by restricting matching to compatible arm counts, skipping and tallying otherwise, and adding a 3-arm vs 2-arm unit case.
- #194: e2e collection could be nondeterministic, and a missing e2e layer was not fatal. Resolved by adding a reliable flush and making a missing layer throw.
- #195: the Req 4 template-line interpretation was loose. Resolved by adding a concrete per-file check.
- #196: the `vite-plugin-istanbul` devDependency build-time requirement and the `v8-to-istanbul` removal were not stated. Resolved by documenting both.

**unit-test:**

- #197: opened 2026-11-11T07:41:21Z, closed 07:42:54Z. A lint failure (`@ts-ignore`, `ban-ts-comment`) in `merge.test.ts`. Resolved by removing the ignore and typing the tests against the new `.d.mts` declarations.

## Coverage

Combined coverage: statements 97.02% (847/873), branches 95.61% (654/684).

**This figure is not comparable with earlier reports.** This run changed how coverage is measured. The old e2e layer was fake: every line was marked hit, which inflated the old figure. The old cross-instrumenter merge also double-counted. Earlier reports' figures should not be compared with this one. The reference figures for the same data with e2e excluded were 96.23% statements and 93.27% branches.

## Other notes

- **Branch protection:** the CI coverage job was renamed, so it needed a manual branch-protection update. The pipeline cannot change that setting. After the user's change, the coverage job was briefly absent from the required checks, and this was flagged to the user. The user updated branch protection to the new job name (2026-11-11).

## Outcome

Deployed. The CD run (42983643116) succeeded.

## Time taken

Total 54 minutes (about 0.9 hours), from 2026-11-11T07:10:36Z to 2026-11-11T08:04:47Z. This spans human wait time too (approvals, manual testing, review turnaround, CI wait), not just active engineering time.
