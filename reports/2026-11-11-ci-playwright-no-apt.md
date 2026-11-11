```metrics
tracking_issue: 207
started_at: 2026-11-11T16:54:49Z
completed_at: 2026-11-11T18:32:49Z
total_hours: 1.63
coverage_percent: 97.03 statements / 95.61 branches
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 52/52 tests
requirements_total: 11
requirements_verified: 11
critical_requirements_without_effective_assertions: 0
unresolved_significant_risks: 0
manual_test: skipped
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

# Post-change report: ci-playwright-no-apt (#207)

This run was spawned mid-pipeline to unblock `task-store-hydration-validation` (PR #203). A repo-wide Ubuntu apt-mirror DNS outage (logged as #204 under that run) made `playwright install --with-deps` fail on every runner. That took down the E2E, Storybook and Combined coverage CI jobs and CD's live e2e check.

## Assurance summary

| Evidence                                           | Value                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| Statement coverage                                 | 97.03% (no source changed; see the coverage caveat below)                   |
| Branch coverage                                    | 95.61%                                                                      |
| Requirements mapped to verification                | 11/11 (R1-R11; there is no `traceability.md`, this is a CI-config-only run) |
| Critical requirements without effective assertions | 0                                                                           |
| Risks (`RISK-NN`) tested / accepted                | 0 / 0 (the one design risk is listed below)                                 |
| Unresolved significant risks                       | 0                                                                           |
| Clarifications (material / non-material)           | 0 / 0                                                                       |
| Manual acceptance                                  | skipped: nothing user-observable; verification was the PR's own CI          |

No unresolved significant risks. One accepted design risk: `ubuntu-latest` might lack a system library Chromium needs. This was mitigated by detectability, with no fallback. The PR's CI and the post-merge `e2e-live` run both launched Chromium and executed tests, so it did not materialise.

Coverage caveat: per project memory, the e2e coverage layer in the merge script has known accuracy flaws (the 2026-11-11 `accurate-coverage-merge` report addresses this). No source was changed here, so the figures are carried over unchanged.

## Requirements

There is no `traceability.md` for this run. The rows below are the R1-R11 in `requirements.md`. They were verified by the PR's CI and review, not by new tests.

| Req    | Requirement                                                                                       | Criticality | Covering evidence                                                                             | QA verdict |
| ------ | ------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- | ---------- |
| R1     | No `--with-deps`, `apt-get`, `apt ` in workflows, `package.json` or `scripts/`                    | high        | Post-edit grep; PR CI logs                                                                    | verified   |
| R2     | The three `pretest:*` hooks still install Chromium                                                | high        | `npm run test:e2e`, `test:storybook` and `test:storybook:interactive` ran green in CI         | verified   |
| R3     | `coverage-merge` and `e2e-live` still install Chromium without apt; the ci.yml comment is updated | high        | PR CI; the CD run                                                                             | verified   |
| R4     | Install depends only on the Playwright CDN                                                        | high        | PR CI install logs show no `apt-get`                                                          | verified   |
| R5, R8 | Missing system libs fail loudly (no fallback)                                                     | high        | No `continue-on-error` or fallback added; Chromium launched fine                              | verified   |
| R6     | No test or threshold changes                                                                      | high        | No test, story or spec files touched; suites ran unchanged                                    | verified   |
| R7     | Local developer behavior preserved                                                                | medium      | Hooks are strictly less privileged; the local suite ran                                       | verified   |
| R9     | No new action or dependency                                                                       | medium      | Diff review                                                                                   | verified   |
| R10    | Docs accuracy                                                                                     | low         | Grep found no `with-deps` text in the docs; `docs-updater` made no changes                    | verified   |
| R11    | Verification on the PR's own CI, plus the post-merge CD `e2e-live`                                | high        | PR CI: E2E 176 and Storybook 52 tests executed, no apt lines. CD `e2e-live` passed post-merge | verified   |

Clarifications raised during the run: none.

## Manual testing

Skipped. The change is install-command changes in CI/CD config only, with nothing user-observable. The evidence relied on was the PR's own CI: no `apt-get` lines in the install steps, E2E 176 tests and Storybook 52 tests executed. The post-merge CD `e2e-live` job also passed. Locally, the implementer's runs were unit 469, BDD 14, e2e 176 and Storybook 48 green.

## Solution

Drop `--with-deps` from every `playwright install` invocation, so browser install no longer touches the apt mirrors. Chromium is downloaded from the Playwright CDN only, and the `ubuntu-latest` image's preinstalled system libraries are relied on. No fallback, cache, new action or npm dependency was added, and no ADR was needed. A missing library would surface as a loud Chromium launch failure.

Files changed:

- `package.json`: `pretest:e2e`, `pretest:storybook` and `pretest:storybook:interactive` now run `playwright install chromium`.
- `.github/workflows/ci.yml`: the `coverage-merge` install step has the same change, and its comment now notes that the install is apt-free.
- `.github/workflows/cd.yml`: the `e2e-live` install step has the same change.

## Test changes

No test, BDD, e2e or Storybook files were added or changed (`unit-test-files`, `bdd-test-files`, `e2e-test-files` and `storybook-test-files` are all empty). Steps 5-7 were a designed no-op. No automated WCAG scan was added or altered, because there is no UI change. The existing suites were the verification vehicle.

## Accessibility

Not applicable: no UI surface was added or changed. No issues carry the `accessibility` label.

## Bugs raised

None. `bug-issues` is empty for this run. The root failure (#204) was logged under the `task-store-hydration-validation` run, not this one.

## Coverage

Combined: 97.03% statements and 95.61% branches. Both are above the 90% threshold, which was not changed. See the coverage caveat under the assurance summary.

## Outcome

`deployed`. The change merged as PR #211 (merge `71c2bf4`) and CD run 43077838978 succeeded, including `e2e-live`. This unblocks PR #203.

## Time taken

1.63 hours in total (2026-11-11 16:54:49Z to 18:32:49Z). This is wall-clock time and includes human wait time (approvals, review turnaround, CI and CD wait), not only active engineering time.
