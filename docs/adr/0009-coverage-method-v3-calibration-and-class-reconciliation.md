# 0009. Coverage method v3: calibration statement and class-based reconciliation

Status: Accepted
Date: 2026-11-11

Extends [ADR 0007](0007-single-statement-universe-and-istanbul-e2e-for-combined-coverage.md) (the single-inventory measurement, now method `v2`). Tracking issue #215.

## Context

`.claude/STANDARDS.md` "Coverage measurement" describes how a combined coverage figure must be produced and validated. `scripts/merge-coverage.mjs` (method `v2`) predated that section and did not meet it. What `v2` could not detect:

- **Reconciliation was a per-layer tally**, not per class. The script printed one "Ignored secondary-only items" count per layer, so it could not tell an item in a known artefact class from a real item the primary layers missed. A new gap in the inventory would have been silently dropped.
- **No calibration statement.** Nothing proved that a statement no test can reach is reported at 0 hits by every layer, so a layer that marked everything as hit would not have been caught.
- **The flat-e2e guard blocked on soft patterns** (uniform hit counts, no zero-hit statement), which the standards treat as advisory signals, and no `Coverage signal:` lines were printed.
- **No determinism check**, no in-scope file counts in the output, and the output contract had no guaranteed ordering (the statement line was documented as last, but the branch line was printed after it).
- **Files on disk that no layer reports** failed the universe check instead of being inserted at zero hits.
- **CI ran the coverage step under the default `sh`**, without `pipefail`, so the script's non-zero exit could be masked by `| tee`.

## Decision

1. **Calibration statement.** `src/composables/useBoardOrdering.ts` gains an exported function that nothing calls, `coverageCalibrationUnreachable`, whose `return 0` carries the marker comment `coverage-calibration-statement`. The file is loaded un-mocked by all four layers, so each provider must emit an entry for it. Validity check 7 finds the statement by marker (not line number) and requires every layer, and the merged inventory, to report it at 0 hits; a layer that omits it fails. A unit test asserts the marker appears once under `src/`, that the enumerator models a `return` on that line, and that nothing else references the function.
2. **Class-based reconciliation.** `combineCoverage` returns `reconciliation: { classes, unclassified }` instead of a per-layer tally. Every secondary-only item is matched against a narrow rule per declared class; anything else is _unclassified_, listed (`Unclassified secondary-only item: src/x.ts:12 statement (bdd)`), and fails validity check 4. Classes (ids are stable, printed as `Coverage reconciliation: class <id>: <n>`, and listed in STANDARDS.md):
   - `bdd-commonjs-emit`: layer `bdd`, statement, no inventory slot, source line begins `import`, `export function`, `export async function` or `export const`.
   - `e2e-vue-template-branch`: layer `e2e`, branch, `.vue`, no slot, strictly inside the top-level `<template>` (a branch in `<script>` never qualifies).
   - `unalignable-branch-arm`: a secondary branch with a slot whose arm count cannot be aligned (today's behaviour, extracted).
   - `e2e-vue-template-expression` (new, fresh-run evidence below): layer `e2e`, statement or function, `.vue`, no slot, strictly inside `<template>`.

   Out-of-scope files (`UNIVERSE_EXCLUDES`, e.g. `src/main.ts`) are filtered out before reconciliation; they are not a class and not unclassified. The top-level `<template>` is the column-0 `<template` line through the next column-0 `</template>` line, so a `<template>` string inside `<script setup>` cannot move the range.

3. **Advisory versus blocking.** `assertE2eLayerIsReal` now blocks only on objective evidence: zero functions, zero branches, or a fully flat layer (every statement of every file one hit count, the historical fake). Uniform hit counts, no zero-hit statements, empty `fnMap`/`branchMap`, statement-count excess and large movement against the last same-method report are `Coverage signal:` lines that never change the exit code. Growing class counts remain a manual `qa-reviewer` comparison, since reports do not carry per-class counts.
4. **Eight validity checks, one pure function.** All post-run analysis moved into `analyzeCoverage()`; each check is reported as `Coverage check N: ok|FAILED`, a throwing check is a failed check (never skipped), and the rest still run. Check 8 re-merges with the layer order reversed (layers are named, so reversal keeps their identity) and compares totals, per-class counts and the unclassified list. Check 5 now also covers the merged inventory, and check 6 adds an inventory-key uniqueness test.
5. **Disk enumeration decides which files count.** A file in scope on disk that no primary layer reports is inserted with every statement, function and branch at 0 hits by `scripts/lib/enumerate-source.mjs` (the `typescript` AST for `.ts`, `vue/compiler-sfc` for `.vue` script blocks; no new dependency). An unparseable file stays missing and fails check 3 by name. Limitation: for an untested `.vue` file only script items are enumerated (template-derived items depend on the SFC compile), which lowers the figure rather than raising it. No such file exists in the repo today.
6. **Output contract.** The final two lines are always `Combined coverage: ...` (statements) then `Combined branch coverage: ...`, and are never printed when any check fails. `node scripts/merge-coverage.mjs --analyze-only` analyses an existing `coverage/` directory without re-running the layers, which lets unit tests spawn the real driver against fixtures.
7. **CI.** The `coverage-merge` step runs with `shell: bash` (GitHub then uses `-eo pipefail`), so the script's non-zero exit fails the step through `tee`. Both grep assignments end `|| true` so that, under `pipefail`, an unmatched grep leaves the variable empty and the existing "Could not parse" messages still print.
8. **Method version `v3`.** STANDARDS.md records `v3`; `report-generator` stamps it into `coverage_method`. The first `v3` report has no same-method baseline, so the movement signal is silent on that run.

## Old and new numbers (same code and test set)

Measured on the same code and tests: `v2` by the orchestrator on unchanged scripts (origin/main 03f06b7, fixed input `v2-baseline.md`), `v3` by the final run on this branch.

| Figure     | `v2` (ADR 0007 method) | `v3` (this ADR)  |
| ---------- | ---------------------- | ---------------- |
| Statements | 97.20% (903/929)       | 97.10% (903/930) |
| Branches   | 96.01% (722/752)       | 96.01% (722/752) |

- **Statements: denominator +1.** The calibration statement is the only change to the inventory; covered stays 903. The drop of 0.10 points is the measurement change (a deliberate never-hit statement), not a test regression.
- **Branches: unchanged.** The bump to `v3` is still justified by the statement denominator and by the changed validity-check semantics (reconciliation by class, eight checks, advisory signals).
- **Pre-existing `v2` "ignored" items, now classified.** `v2` printed `bdd statements=25; e2e statements=5 branches=42 functions=4` (76 items). In `v3`:

| Class / disposition                        | `v2` baseline items | `v3` run |
| ------------------------------------------ | ------------------- | -------- |
| `bdd-commonjs-emit`                        | 25                  | 26       |
| `e2e-vue-template-branch`                  | 40                  | 40       |
| `unalignable-branch-arm`                   | 2                   | 2        |
| `e2e-vue-template-expression`              | 8                   | 8        |
| out of scope (`src/main.ts`, scope filter) | 1                   | n/a      |
| unclassified                               | 0                   | 0        |

- **`bdd-commonjs-emit` is 26, not 25.** The extra item is the calibration function's own line, `src/composables/useBoardOrdering.ts:41`, `export function coverageCalibrationUnreachable(): number {`. ts-node's CommonJS emit attributes a statement to every `export function` line, so the new function adds one item to this class, exactly as the 12 existing `export function` items do. The statement on the `return 0` line is the calibration statement and stays at 0 hits.

## Artefact-class evidence for `e2e-vue-template-expression`

The `v2` baseline reproduced 4 e2e statements and 4 e2e functions with no inventory slot, all in `.vue` files and strictly inside `<template>`, from the production SFC compile of template attribute bindings (the same production-versus-development compile difference as `e2e-vue-template-branch`, whose rule is not widened):

- statements: `ref="taskNameInputRef"` (`AddTaskModal.vue:114`), `id="task-due-by"` (`AddTaskModal.vue:230`), `ref="nameInputRef"` (`TaskDetailModal.vue:141`), `id="task-detail-due-by"` (`TaskDetailModal.vue:247`);
- functions: the `@keydown.esc` handlers (`CloseConfirmDialog.vue:30`, `TaskDetailDiscardDialog.vue:30`, `TaskDetailDeleteDialog.vue:30`) and `v-model="item.text"` (`TaskDetailModal.vue:292`).

An earlier stale-data candidate (`useTasks.ts:188`, a bdd item on a closing-brace line) did not reproduce; no bdd class beyond `bdd-commonjs-emit` is added. If such an item recurs it surfaces as unclassified and fails check 4, which is the intended route.

## Consequences

- Figures move because the method changed, not because tests did; `quality-reporter` reads `coverage_method` so it never treats the `v3` step as a trend.
- A future change that makes `coverageCalibrationUnreachable` reachable (imported or called) fails check 7 by design; a unit test guards against it.
- The movement signal and the `Coverage reconciliation:` lines give `qa-reviewer` the material for the manual "growing class counts" comparison.
- Adding a class needs fresh-run evidence and a matching edit in `ARTEFACT_CLASSES`, STANDARDS.md and this ADR (a unit test compares the first two).
