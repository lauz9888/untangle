```metrics
tracking_issue: 215
started_at: 2026-11-11T18:35:20Z
completed_at: 2026-11-11T20:00:43Z
total_hours: 1.42
coverage_percent: 97.10
branch_coverage_percent: 96.01
coverage_method: v3
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: unavailable
requirements_total: 30
requirements_verified: 30
critical_requirements_without_effective_assertions: 0
unresolved_significant_risks: 0
manual_test: skipped
outcome: deployed
bugs_by_stage:
  requirement: 1
  design: 5
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

# Post-change report: coverage-measurement-conformance

Tracking issue #215, PR #223 (merged as 91e4009), branch `feature/coverage-measurement-conformance`. Change: brought `scripts/lib/coverage-merge.mjs` and `scripts/merge-coverage.mjs` into conformance with `.claude/STANDARDS.md` "Coverage measurement". This run introduced coverage method v3 (ADR 0009).

Data-quality notes: `storybook_story_count` (48) and `storybook_interaction_test_count` (35) are counts of exported stories and `play` functions in `src/components/*.stories.ts`. This run had no UI change and touched no stories, and the Storybook pass rate was not recorded in `state.md`, so `storybook_a11y_pass_rate` is `unavailable`. `unresolved_significant_risks: 0` counts significant unresolved risks; RISK-10 and RISK-11 below are accepted and documented, not open. `requirements_verified: 30` follows QA's cycle 1 approval; REQ-026 and REQ-027 are verified by review only.

## Assurance summary

| Evidence                                           | Value                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Statement coverage                                 | 97.10% (903/930), method v3                                        |
| Branch coverage                                    | 96.01% (722/752), method v3                                        |
| Requirements mapped to verification                | 30 / 30 (2 by review only, 1 by real run)                          |
| Critical requirements without effective assertions | 0                                                                  |
| Risks (`RISK-NN`) tested / accepted                | 9 tested / 2 accepted (RISK-10, RISK-11) of 11                     |
| Unresolved significant risks                       | 0                                                                  |
| Clarifications (material / non-material)           | 1 / 3 (C1 material; C3, C5, C6 non-material; C4 was a fixed input) |
| Manual acceptance                                  | skipped (see Manual testing)                                       |

Accepted limitations, none open as defects:

- RISK-10: the e2e production-compile classes could mask a real gap that resembles them. Narrow location rules limit exposure. Resolve by comparing per-class counts across runs.
- RISK-11: v3 is not comparable with v2 (the denominator gains the calibration statement), and the first v3 run has no same-method movement baseline. Mitigated by ADR 0009 and the `coverage_method` stamp.
- Untested `.vue` files enumerate script items only, which understates and never overstates coverage. None exist today; documented in ADR 0009.
- Storybook empty function/branch map signals on four `sb.mock`-redirected composables are explained and pre-existing (ADR 0008).
- Class-count drift is checked manually until reports carry per-class counts.

## Requirements

All 30 requirements are covered in the unit layer only; BDD, e2e and Storybook have none by reviewer-approved design. Full detail is in `.workflow/coverage-measurement-conformance/traceability.md`.

| REQ     | Requirement                                                                       | Tests                              | QA verdict              |
| ------- | --------------------------------------------------------------------------------- | ---------------------------------- | ----------------------- |
| REQ-001 | Secondary-only items classified into exactly one class or unclassified (critical) | merge U3/U7/U31/U32, reconcile     | verified                |
| REQ-002 | Unclassified items reported individually, never dropped (critical)                | merge U3/U7/U9, reconcile          | verified                |
| REQ-003 | Check 4 fails on any unclassified item (critical)                                 | reconcile, driver                  | verified                |
| REQ-004 | Classified items do not alter totals; counts deterministic                        | merge U32, reconcile               | verified                |
| REQ-005 | Single exported class constant matching STANDARDS.md                              | reconcile, output                  | verified                |
| REQ-006 | Reconciliation and per-layer summaries printed                                    | output, driver                     | verified                |
| REQ-007 | Check 3 (file on disk missing from inventory) retained (critical)                 | checks                             | verified                |
| REQ-008 | Calibration statement unreachable in all layers (critical)                        | checks, calibration                | verified                |
| REQ-009 | Check 7 fails if any layer hits the calibration statement (critical)              | checks, calibration, driver        | verified                |
| REQ-010 | Calibration located by marker, not line number                                    | checks, calibration                | verified                |
| REQ-011 | `Coverage signal:` lines never change exit code (critical)                        | signals, driver                    | verified                |
| REQ-012 | E2E guard blocks only on objective evidence (critical)                            | merge U16/U17, checks              | verified                |
| REQ-013 | Signal lines name layer, file and pattern                                         | signals                            | verified                |
| REQ-014 | Check 8 order-independence (critical)                                             | checks                             | verified                |
| REQ-015 | Final output contract and order (critical)                                        | output, driver                     | verified                |
| REQ-016 | Checks 1 and 2 retained (critical)                                                | checks, output, driver             | verified                |
| REQ-017 | Checks 5 and 6 on real data, unique inventory keys (critical)                     | merge, checks                      | verified                |
| REQ-018 | CI `coverage-merge` job honours pipefail and gates (critical)                     | ci-workflow                        | verified                |
| REQ-019 | Calibration 1 (critical)                                                          | checks, calibration                | verified                |
| REQ-020 | Calibration 2: untested file appears at 0 hits (critical)                         | checks, enumerate, driver          | verified                |
| REQ-021 | Calibration 3: column offsets counted once (critical)                             | merge U1/U6 plus branch case       | verified                |
| REQ-022 | Calibration 4: real secondary item surfaces as unclassified (critical)            | merge U7, reconcile                | verified                |
| REQ-023 | Every check and signal has pure-logic tests (critical)                            | checks, signals                    | verified                |
| REQ-024 | Calibration 6: output contract and CI (critical)                                  | ci-workflow                        | verified                |
| REQ-025 | Method bumped to v3 and ADR 0009 (critical)                                       | ci-workflow, content checked at QA | verified                |
| REQ-026 | "Conformance gaps" subsection deleted                                             | not automatable                    | verified by review only |
| REQ-027 | Documentation consistent                                                          | not automatable                    | verified by review only |
| REQ-028 | Real `test:coverage:merge` run passes, no unclassified (critical)                 | real run at Steps 9-12             | verified                |
| REQ-029 | Cross-platform path normalisation                                                 | reconcile, driver                  | verified                |
| REQ-030 | No extra test-layer run for added checks                                          | driver                             | verified                |

Clarifications raised during the run:

- C1 (#217, material, re-approved): REQ-005/REQ-001 fixed the class count at three, but offline data showed 4 e2e statements and 4 functions on `.vue` template lines fitting none. Decided: classes are the three in STANDARDS plus any class added per REQ-028 with evidence; `e2e-vue-template-expression` was adopted on a fresh baseline.
- C3: U16/U31 changes, not material.
- C4: the v2 baseline (`v2-baseline.md`) is a fixed input.
- C5: report metrics format correction for `parseBaselineFromReport`.
- C6: `bdd-commonjs-emit` target is 26 (calibration export line); a `reconcile.test.ts` script-line case was corrected.

## Manual testing

Skipped. The user chose "Skip, rely on automation". There is no UI change, and the only runtime change is one never-called export. Automated evidence relied on: a real `test:coverage:merge` run (8/8 checks ok, 0 unclassified, calibration at 0 hits in all four layers), the full unit, BDD, e2e and Storybook suites, the base-path e2e run (179/179) and QA approval.

The first base-path smoke attempt was invalid because of an orchestrator harness error (preview started without `GITHUB_PAGES=true`, so it served base `/`). It was corrected and passed 179/179 at `http://localhost:4174/untangle/`. No issue was filed.

## Solution

Moved all post-run analysis out of the driver into one pure `analyzeCoverage(...)` in the lib, returning the merge result, check results, signal lines and output lines, so every check, signal and the output order is unit-testable. Added a driver `--analyze-only` flag (analyse an existing `coverage/` directory without running the layers) for a few process-level tests. Replaced the per-layer `ignored` tally with `reconciliation: { classes, unclassified }`, classed through an exported `ARTEFACT_CLASSES` constant (four classes: `bdd-commonjs-emit`, `e2e-vue-template-branch`, `unalignable-branch-arm`, `e2e-vue-template-expression`). Added a marker-located calibration statement, eight validity checks (including calibration-hit and order-reversal determinism), advisory `Coverage signal:` lines, disk enumeration of untested files at zero hits, and the exact two-line output contract. The e2e guard now blocks only on objective evidence. `ci.yml`'s `coverage-merge` step now enables pipefail. STANDARDS.md moved to v3, the "Conformance gaps" subsection was removed, and ADR 0009 records v2 versus v3 figures and class evidence.

## Test changes

Unit layer only (`tests/unit/coverage-merge/`). None include a WCAG scan because there is no UI.

- `merge.test.ts` (changed): U3, U7, U9, U16, U17, U31, U32 rewritten for class-based reconciliation and the revised e2e guard. Independent review approved at bc48692; nothing weakened or deleted.
- `reconcile.test.ts`: class assignment, unclassified reporting, class ids parsed from STANDARDS.md.
- `checks.test.ts`: pass and fail for each validity check, including determinism.
- `signals.test.ts`: each advisory signal emitted when present and absent otherwise.
- `output.test.ts`: summary builders and the contract-line formatter.
- `enumerate.test.ts`: disk enumeration and zero-hit insertion.
- `calibration.test.ts`: marker location and drift guard.
- `driver.test.ts`: spawned `--analyze-only` driver, exit codes and last two lines.
- `ci-workflow.test.ts`: `ci.yml` pipefail, contract greps, thresholds, v3 and ADR 0009.
- `fixtures.ts`: shared helpers.

BDD, e2e and Storybook: none.

## Accessibility

No UI-facing requirements; the change touches build scripts, CI config and docs only. No accessibility issues were raised.

## Bugs raised

Six issues, all closed; none raised by tests, QA, CI or CD.

Requirement stage:

- #217 "clarification: REQ-005 fixed class count", opened 2026-11-11T18:44:29Z, closed 18:47:50Z. Resolved by amending REQ-005/REQ-001 (see C1).

Design stage (all found by solution-reviewer at design review cycle 1; all closed 18:55:51Z to 18:55:59Z):

- #218 (opened 18:49:32Z): fresh v2 baseline run was owned too late (Step 8), so red tests would guess the class decision. Resolved by producing the baseline up front.
- #219 (18:49:33Z): D4 widened class 1 for the `useTasks.ts:188` closing brace, against REQ-005.
- #220 (18:49:35Z): `ci.yml` grep `|| true` mitigation (RISK-07) was missing from file changes and tests.
- #221 (18:49:36Z): calibration drift-guard scan would match its own test files.
- #222 (18:49:38Z): Test impact kept the e2e-vue-template-handler tests conditional. Resolved by adopting the class, so its tests are unconditional.

## Coverage

Combined statement coverage 97.10% (903/930) and branch coverage 96.01% (722/752), coverage method v3. Real run: 8/8 checks ok; class counts 26/40/2/8; unclassified 0; disk file count 26 equals inventory 26. For comparison, v2 on the same baseline was 97.20% (903/929) and 96.01% (722/752); the difference is the calibration statement added to the denominator, so the two methods are not comparable (RISK-11). Open coverage investigations: none recorded in `state.md`. Signals investigated and explained: Storybook empty function/branch maps (four composables) and a BDD statement excess on `useCompletedPanel.ts`.

## Outcome

Live: `deployed` (CD run 43091734420, merge commit 91e4009).

## Time taken

1.42 hours (2026-11-11T18:35:20Z to 20:00:43Z). This spans human wait time too (approvals, manual testing, review turnaround, CI wait), including a pause while the prerequisite PRs #205, #208 and #212 landed, so it is not pure engineering effort.
