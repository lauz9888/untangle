# Post-change report: trim-bdd-duplication

```metrics
tracking_issue: 132
started_at: 2026-09-27T17:20:42Z
completed_at: 2026-09-27T17:49:51Z
total_hours: 0.49
coverage_percent: 96.92
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 0
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 0
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 0
```

## Requirements

A test-suite-only refactor: trim the BDD test suite (`features/`) to remove scenarios that
duplicate existing unit composable tests at identical grain, keeping only scenarios that add
genuine BDD-layer value. No production code (`src/**`) or unit/e2e test (`tests/unit/**`,
`tests/e2e/**`) changes were in scope. Requirements independently re-verified every proposed
deletion/keep decision against the corresponding `tests/unit/**/composable.test.ts` file, including
two corrections to the original request's proposed keep-list: "Saving a valid task in the Add Task
modal adds it to the task store" and "Saving with an empty task name leaves the store empty" were
confirmed to also be duplicates (an equivalent cross-composable `describe` block already exists in
`tests/unit/add-task-modal/composable.test.ts`), so `features/task-management.feature` was reduced
to exactly one scenario rather than three. The five whole-file deletions
(`energy-level-selection.feature`, `encourage-me.feature`, `tough-love.feature`,
`toast-dismissal.feature`, `now-next-later-sections.feature`), the 5-scenario trim of
`add-task-modal.feature`, the 1-scenario trim of `task-management.feature`, and the corresponding
step-definition/`world.ts` cleanup were all specified with verbatim keep-lists so nothing kept was
rephrased or restructured.

## Solution

No design decision beyond direct file surgery — no new dependency, pattern, or state-management
approach was introduced, so `design.md` records no ADR. The design's "Requirement coverage map"
maps each requirement straight to a file-change section (§A deletes the 5 whole feature files, §B/§C
trim `add-task-modal.feature`/`task-management.feature` to their verbatim keep-lists, §D–§F strip
now-orphaned step definitions from `energy.steps.ts`/`add-task-modal.steps.ts`/`task-store.steps.ts`
while explicitly preserving every still-referenced helper and step body unmodified, §G deletes
`section-collapse.steps.ts` outright, §H trims `features/support/world.ts`'s `EnergyWorld` down to
`energy`/`addTaskModal`/`tasks` once `useSectionCollapse()` wiring becomes fully unused). The
design's own "Test impact" section is explicit that this change _is_ the test change: there was no
separate red/green cycle to run because nothing new was being added, only removed, and everything
removed was already covered at the unit layer.

This run therefore deliberately departed from the pipeline's usual red/implement/green shape:

- Steps 5 and 7 (unit-test-author, e2e-test-author) were no-ops — Requirements 7/8 explicitly
  forbid touching `tests/unit/**`/`tests/e2e/**`, and design.md's "Test impact" section confirms
  there was nothing for either agent to add.
- Step 8 (implementer) was a no-op — Requirement 7 forbids any `src/**` change, and there was no
  new behavior to implement.
- Step 6 (bdd-test-author) applied the trim directly (deletions plus the verbatim-preserving edits
  in §B–§H) and confirmed the result green, rather than the usual write-failing-test-first sequence,
  since there was no new scenario to write red before making it pass — only existing scenarios/steps
  to remove or leave untouched.

## Test changes

BDD (Cucumber) only — no unit or e2e file was added, removed, or modified this run:

- Deleted outright: `features/energy-level-selection.feature`, `features/encourage-me.feature`,
  `features/tough-love.feature`, `features/toast-dismissal.feature`,
  `features/now-next-later-sections.feature`, and `features/step_definitions/section-collapse.steps.ts`
  — every scenario in these files duplicated `tests/unit/energy-level/composable.test.ts` or
  `tests/unit/now-next-later/composable.test.ts` at identical grain.
- Trimmed `features/add-task-modal.feature` from 24 scenarios/outlines to 5, keeping only the
  multi-step journeys with no unit-level equivalent shape (open-modal defaults; discard-confirm/
  cancel/reopen; save-after-correcting-a-date-conflict). The other 19 duplicated
  `tests/unit/add-task-modal/composable.test.ts` scenario-for-scenario.
- Trimmed `features/task-management.feature` from 12 scenarios to 1 ("Tasks added in sequence come
  back in that same order" — the one property no unit test in
  `tests/unit/tasks/composable.test.ts` asserts, since none checks `tasks.value` array order, only
  id ordering).
- Correspondingly trimmed `features/step_definitions/energy.steps.ts` (kept only the shared
  `Given('a fresh session', ...)` reset step used by every surviving `Background`),
  `features/step_definitions/add-task-modal.steps.ts` (kept only steps matched by the 5 surviving
  scenarios, plus a dangling-comment fix during QA review), and
  `features/step_definitions/task-store.steps.ts` (kept only the two steps matched by the 1
  surviving scenario), each removing now-dead helper functions and imports alongside the orphaned
  step bodies.
- Trimmed `features/support/world.ts`'s `EnergyWorld` to drop the now-fully-unused
  `useSectionCollapse()` wiring and `lastToggledSectionKey` field.

Net diff: 12 files changed, 10 insertions(+), 763 deletions(-). No file under `tests/unit/**` or
`tests/e2e/**` was touched, so no automated WCAG scan (`jest-axe`/`@axe-core/playwright`) coverage
was added, removed, or otherwise affected by this run.

## Accessibility

Not applicable, per both `requirements.md`'s and `design.md`'s explicit "Accessibility"/
"Accessibility requirements" sections: this is a test-suite-only refactor with no production code
change and no new or altered UI surface, so there is no UI-facing requirement to map to a scan and
nothing here can regress WCAG conformance. No issue in this run carried the `accessibility` label.

## Bugs raised

None. `gh issue list --search "Related to #132" --state all` returns only the tracking issue itself
(#132), auto-closed by the PR merge — no `requirement`, `design`, `unit-test`, `bdd-test`,
`e2e-test`, `qa`, `deploy-path`, `manual-test`, `ci`, or `cd` issue was filed against this run. The
one mid-run correction (fixing a dangling comment reference to the now-deleted
`section-collapse.steps.ts` in `task-store.steps.ts`'s top-of-file comment) was made directly during
Step 12's QA review, not filed as a separate bug — a documentation-accuracy fix, not a defect.

## Coverage

96.92% combined statement coverage (unit + BDD + e2e merged), above the threshold in
`.claude/STANDARDS.md` — confirming design.md's expectation that removing duplicated BDD scenarios
would not lower coverage, since every line they exercised remains exercised by the corresponding
unit `composable.test.ts` files.

## Outcome

Deployed — merged to `main` (PR #133, previous-main-sha `222eb42e`, merge-sha `757b5a92`) and
confirmed live via CD run 36338071523 (`cd-outcome: deployed`).

## Time taken

Total elapsed time from requirements intake to this report: approximately 0.49 hours (29 minutes,
2026-09-27T17:20:42Z to 2026-09-27T17:49:51Z). As with every run, this figure spans human wait time
(the Step 2 requirements-approval gate and the Step 14 manual-test sign-off both depend on the
user's own availability) as well as active engineering time, not pure implementation effort — this
run's short elapsed time reflects both its narrow, subtractive scope and quick turnaround on both
gates, not a different accounting basis from other reports in this series.
