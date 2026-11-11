```metrics
tracking_issue: 201
started_at: 2026-11-11T14:43:24Z
completed_at: 2026-11-11T18:41:00Z
total_hours: 3.95
coverage_percent: 97.20
branch_coverage_percent: 96.01
coverage_method: v2
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 48/48 stories
requirements_total: 22
requirements_verified: unavailable
critical_requirements_without_effective_assertions: unavailable
unresolved_significant_risks: 0
manual_test: performed
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
  ci: 1
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

# Post-change report: task-store-hydration-validation

Tracking issue #201, PR #203 (merged as 1be491f), branch `feature/task-store-hydration-validation`. Change: per-task validation and normalisation of `untangle:tasks` at hydration in `src/composables/useTasks.ts`.

Data-quality notes for the metrics block: this run has no `traceability.md` and its requirements are numbered 1-22 rather than `REQ-NNN`, and no per-requirement QA verdicts or `residual-risks` were recorded in `state.md`. `requirements_total` counts the 22 numbered requirements; `requirements_verified` and `critical_requirements_without_effective_assertions` are `unavailable` rather than guessed. `unresolved_significant_risks: 0` means none were recorded. `storybook_story_count` (48) is the count of exported stories; the `48/48` pass rate is taken from `state.md`'s "storybook 48" green result.

## Assurance summary

| Evidence                                           | Value                                               |
| -------------------------------------------------- | --------------------------------------------------- |
| Statement coverage                                 | 97.20%                                              |
| Branch coverage                                    | 96.01%                                              |
| Requirements mapped to verification                | not recorded (no traceability.md) / 22              |
| Critical requirements without effective assertions | not recorded                                        |
| Risks (`RISK-NN`) tested / accepted                | none recorded                                       |
| Unresolved significant risks                       | 0 recorded                                          |
| Clarifications (material / non-material)           | 0 / 0 recorded (requirements had no open questions) |
| Manual acceptance                                  | passed (with the caveat below)                      |

No unresolved significant risks are recorded. Known limitations, all documented design decisions rather than open risks:

- Repaired data is not written back at load, so a repaired `createdAt` fallback (hydration time) can differ per load until the next mutation persists it; dropped entries are lost at that next mutation. Resolve by adding a schema version and eager migration (explicitly out of scope).
- Manual-test provenance is unverified (see Manual testing).

## Requirements

All 22 requirements come from the user-approved `requirements.md` (approved 2026-11-11; no open questions). No criticality ratings or per-requirement QA verdicts were recorded, so rows are grouped. QA ran at Step 12 (outcome "changes-made", suites re-run green).

| Req    | Requirement                                                                                    | Covering tests                                     |
| ------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1      | Evidence-first characterization of failure modes                                               | Red-first unit and e2e runs; `characterization.md` |
| 2-4    | Per-element validation; drop non-objects and empty/non-string names; invalid id is recoverable | `tests/unit/tasks/composable.test.ts`; e2e (b)     |
| 5-8    | Field repair defaults, sub-task normalisation, timestamp fallbacks, no cross-field date repair | unit, one case per rule                            |
| 9-11   | Deterministic fresh ids for missing/duplicate, strip unknown properties, NaN-safe next id      | unit                                               |
| 12-13  | Valid data round-trips unchanged; existing fallbacks preserved                                 | unit (incl. 1,000-task case)                       |
| 14, 18 | Consumers do not throw on hydrated data                                                        | unit consumer-regression block; e2e (a)-(c)        |
| 15     | No write-back at load                                                                          | unit (`setItem` spy, raw string unchanged)         |
| 16-17  | Unit coverage including labelled-synthetic older-schema cases                                  | unit                                               |
| 19     | E2E: example record, mixed array, incomplete record completable                                | `tests/e2e/task-persistence.spec.ts`               |
| 20-22  | Coverage gate, performance/no dependency, no API/type/key change                               | coverage merge; unit                               |

Verdict: not recorded per requirement; all suites green and QA complete.

Clarifications: none were raised during the run. The user's pre-approved decisions (fresh ids above max, invalid section to `now`, estimate coerced and clamped to modal limits, empty sub-tasks dropped, dates kept as stored, extra properties stripped, no write-back at load) are recorded in `requirements.md`.

## Manual testing

Performed (Step 14); the user reported a pass. Caveat: the preview-pane dev server exited about 20 seconds after it started, so it is unverified which server the user actually tested against. The orchestrator's own pre-handover browser check, run while the server was up, rendered mixed malformed data with no console errors. No defects were found at this gate. The automated evidence relied on is the e2e trio in `tests/e2e/task-persistence.spec.ts`, which runs in real Chromium against malformed stored data.

## Solution

`loadInitialTasks()` now returns `normalizeStoredTasks(parsed, Date.now())`, a linear, pure, unexported set of hand-written type guards in `useTasks.ts` (no new dependency, no change to the `Task` type, storage key or public API).

- Non-array JSON gives `[]`; non-object elements and elements with a missing, non-string or blank `name` are dropped; every other element is repaired and rebuilt from known fields only.
- Defaults: section `now`, description `''`, energy level `null`, estimate zeros (floored, hours capped at 23, minutes at 59), dates `null`, `done` false, sub-tasks `[]`.
- Sub-tasks are normalised individually (blank or non-string text dropped, text trimmed, ids unique within the task).
- Timestamps fall back to each other, then to hydration time.
- Task ids are resolved in array order: the first holder keeps a valid id, and missing or duplicate ids get fresh ids above the maximum valid id, so the next id can never be `NaN`.
- Hydration never writes to storage; the next mutation persists the normalised list. ADR 0003 received an addendum; no new ADR.

## Test changes

- Unit: `tests/unit/tasks/composable.test.ts` (73 cases in the file) adds hydration cases at single-action grain for each repair or drop rule, duplicate ids, NaN-safe next id, valid round-trip, 1,000-task list, mixed lists, the request's example record, no-write-back, labelled-synthetic older-schema shapes, and consumer regressions (board grouping, `useTaskDetail.open`, `toggleSubTaskDone`, `toggleTaskDone`, `updateTask`, `removeTask`, Completed panel). No jest-axe additions (no DOM change).
- BDD: none (store-level logic with no multi-step journey).
- E2E: `tests/e2e/task-persistence.spec.ts` adds (a) the example record renders in Now and opens in the detail dialog, (b) a mixed array renders only survivors with zero page errors, (c) an incomplete record can be completed and appears checked in the Completed panel. The a11y e2e spec is unchanged.
- Storybook: none changed (`storybook-test-files: []`); the existing 48-story suite stayed green, including its addon-a11y scans.

Evidence-first findings (`characterization.md`): a `null` element crashed module load (`Cannot read properties of null (reading 'id')`, app never mounted); an invalid or missing `section` threw in board grouping and blanked the board; missing `estimate` or `subTasks` threw when opening the detail view (and `subTasks` on sub-task toggle); missing or string ids made the next id `NaN`; wrong-typed fields leaked through unchanged. Toggle, update and remove did not throw on incomplete records, so those guards are labelled defensive.

## Accessibility

No UI changes, so no new WCAG requirements. Coverage is the unchanged existing suites (jest-axe, `tests/e2e/a11y.spec.ts`, Storybook addon-a11y), all green. The e2e cases confirm the normal board renders rather than a blank page or new error state after bad data. A side benefit: dropping nameless tasks removes an unnamed-button defect. No issues carry the `accessibility` label.

## Bugs raised

By stage (1 issue, 0 security, 0 accessibility):

- ci: #204 "CI failure - Playwright browser install (runner DNS)". Opened 2026-11-11T16:41:23Z, closed 2026-11-11T18:31:22Z. E2E, Storybook and Combined-coverage jobs failed before any test ran because `npx playwright install --with-deps` could not resolve apt hosts. This was a repo-wide runner DNS/apt outage, not a defect in this change. It was resolved by a separate pipeline run, `ci-playwright-no-apt` (PR #211, `reports/2026-11-11-ci-playwright-no-apt.md`). PR #203's branch was then updated from `main` and CI went 20/20 green.

No bugs were filed at the unit, BDD, e2e or Storybook stages (no bug-fix loops in Steps 9-11a).

## Coverage

Combined statement 97.20% and branch 96.01% (coverage method v2; both above the 90% gate). No coverage investigations are recorded in `state.md`.

## Outcome

Live (`deployed`). The PR's own CD run 43078582746 was cancelled before starting because a newer pending run superseded it in the `pages` concurrency group. The deploy happened via run 43079051259 at `03f06b7`, which contains merge `1be491f`, with all jobs (including live e2e) green. No `cd` issue was needed.

## Time taken

About 3.95 hours (14:43:24Z to roughly 18:41Z on 2026-11-11). This spans human wait time too (approvals, manual testing, review turnaround and CI wait), notably about 1h50m during which CI was blocked by the runner DNS outage (#204, 16:41Z to 18:31Z). It is not pure implementation effort.
