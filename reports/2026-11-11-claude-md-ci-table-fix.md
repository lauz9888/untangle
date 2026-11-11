```metrics
tracking_issue: 206
started_at: 2026-11-11T16:31:30Z
completed_at: 2026-11-11T17:14:12Z
total_hours: 0.71
coverage_percent: statements 97.03 (851/877), branches 95.61 (654/684)
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 48/48 stories
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 0
  unit-test: 0
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

# Post-change report: claude-md-ci-table-fix

Tracking issue #206, feature PR #209 (merge `abd2158`). A follow-up documentation fix to accurate-coverage-merge (#198).

## Requirements

Remove the stray `scripts/lib/coverage-merge.mjs` row from `CLAUDE.md`'s "Pull requests and CI" table, which should list only the 10 `ci.yml` jobs. The #198 docs reconciliation had added that row. Describe the lib in the "Key files" table instead, next to `scripts/merge-coverage.mjs`. The new row names `combineCoverage`, `loadLayers`, the runtime guards and ADR 0007. `CLAUDE.md` must still pass Prettier, and nothing else may change.

## Solution

A documentation-only edit to `CLAUDE.md`:

1. Delete the stray CI-table row.
2. Add a `scripts/lib/coverage-merge.mjs` row to "Key files", directly after the `scripts/merge-coverage.mjs` row.
3. Run `npx prettier --write CLAUDE.md` to reflow table padding.

No ADR was needed. Docs reconciliation found no other changes needed.

## Test changes

None. There are no unit, BDD, e2e or Storybook changes, and no UI surface, so no automated WCAG scan applies. The Storybook counts in the metrics block are carried over from the previous report (unchanged by this run).

## Accessibility

No UI-facing requirements. No issues carry the `accessibility` label.

## Bugs raised

None. `bug-issues` is empty.

## Coverage

Statements 97.03% (851/877), branches 95.61% (654/684), as recorded in `state.md`. Both are above the 90% gate. The base-path check was a no-op because the change touches only `CLAUDE.md`.

## Outcome

`deployed`. CD run 43065372949 succeeded.

## Time taken

About 0.71 hours (42 minutes), from 2026-11-11T16:31:30Z to 17:14:12Z. This spans human wait time too (approvals, manual testing, review turnaround, CI wait), not just active engineering time.
