# Untangle — Claude Code guide

## Dev server

```
npm run dev
```

Opens at `http://localhost:5173`. Vite's HMR reloads the browser on every save. A Claude Code hook in `~/.claude/settings.json` starts this automatically on the first file edit each session, so you usually don't need to run it manually.

## Tests

```
npm test                # unit tests (Vitest, watch mode)
npm run test:coverage   # unit tests with v8 coverage report + threshold gate
npm run test:e2e        # end-to-end tests (Playwright, requires dev/build+preview server)
```

`playwright.config.js` builds and serves the app itself (`npm run build && npm run preview`) before running e2e tests, so you don't need a separate server running.

## Architecture in brief

All task state lives in `src/composables/useTasks.js` — a module-level singleton (Vue reactive refs outside the function). Every component that calls `useTasks()` shares the same state. Follow the same singleton pattern for any other cross-component state.

`src/composables/useEnergyLevel.js` follows the same singleton pattern for the header's energy-level selector (`src/components/EnergySelector.vue`) and its toast notification (`src/components/ToastNotification.vue`): selecting a Low/Medium/High level picks a random encouraging message from a 20-message-per-level pool and shows it as a toast, which auto-dismisses after a few seconds or can be closed manually. Selection is in-memory only and always resets to "none" on reload.

Components are thin: they call composable functions and render results. Business logic stays in composables.

## Test organisation

Unit tests in `tests/unit/<feature>/` always come in pairs:

- `composable.test.js` — resets the module between tests (`vi.resetModules()`) for fresh state
- `components.test.js` — mocks the composable entirely (`vi.mock(...)`) to isolate rendering

Don't mix the two styles in the same file — they're incompatible.

E2E tests in `tests/e2e/` clear `localStorage` and reload before every test so they're fully independent. Shared helpers live in `tests/e2e/helpers.js`.

## Bug tracking

Bugs are tracked as GitHub issues whenever they are identified, wherever in the pipeline they're found. Every issue records which stage detected it — in the issue body (`**Detected by:**`) and as a GitHub label — so issues can be filtered by detection source.

Run `node scripts/bug-tracker.mjs create <category> "<title>" "<body>"` to log one; pipeline skills do this automatically. `node scripts/bug-tracker.mjs close <number> "<resolution>"` closes it, or include `Fixes #N` / `Closes #N` / `Resolves #N` in a commit message — the `post-commit` hook closes it automatically.

| Category                                                                                                       | Where it's raised                                                                                                |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `requirement`                                                                                                  | User disagrees with a proposed requirement (`requirement-analysis`)                                              |
| `design`                                                                                                       | Solution review finds a gap (`solution-review`)                                                                  |
| `unit-test`                                                                                                    | Unit test review finds a coverage gap, or a red-phase test unexpectedly passes (`unit-test-review`)              |
| `implementation`                                                                                               | Nontrivial issue found while implementing (`solution-implementation`)                                            |
| `refactor`                                                                                                     | Refactor breaks a passing test (`solution-refactor`)                                                             |
| `e2e-test`                                                                                                     | E2E test review finds a coverage gap (`e2e-test-review`)                                                         |
| `e2e`                                                                                                          | The real e2e suite fails (`e2e-test-execution`)                                                                  |
| `manual`                                                                                                       | User finds a bug during manual testing (`manual-testing`), or any bug found outside the pipeline (`/report-bug`) |
| `ci-lint`, `ci-build`, `ci-unit-tests`, `ci-coverage`, `ci-e2e`, `ci-a11y`, `ci-security`, `ci-pwa`, `ci-docs` | The matching CI job fails on the PR (`deploy-branch`)                                                            |

The core script is `scripts/bug-tracker.mjs` — it handles deduplication (won't create a second issue if one with the same title is already open).

## Developer workflow

Every code change follows a 14-stage, test-driven pipeline. Skills live in `.claude/skills/` and are available to all developers who clone the repo. State is tracked in `.claude/workflow/state.json` via `scripts/workflow-state.mjs`.

### With Claude (automated)

A change request kicks the pipeline off automatically at step 1 and each step chains to the next via the Skill tool:

| #   | Skill                      | What it does                                                                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `/requirement-analysis`    | Turns the request into a clear requirement; loops with the user until they explicitly approve it                                     |
| 2   | `/solution-design`         | Designs the implementation approach                                                                                                  |
| 3   | `/solution-review`         | Reviews the design against requirements, codebase fit, best practice, testability, OSS-only deps; loops back to 2 until satisfied    |
| 4   | `/unit-test-analysis`      | Writes/updates unit tests for the requirement + design (TDD red phase — no implementation yet)                                       |
| 5   | `/unit-test-review`        | Checks test coverage, signs off, then runs the tests expecting them to fail                                                          |
| 6   | `/solution-implementation` | Branches off `main`, implements the design, iterates until unit tests pass                                                           |
| 7   | `/solution-refactor`       | Cleans up for coding standards, reruns tests; loops back to 6 if refactoring breaks anything                                         |
| 8   | `/e2e-test-analysis`       | Writes/updates Playwright specs for the change                                                                                       |
| 9   | `/e2e-test-review`         | Checks e2e coverage, signs off, then runs the specs expecting them to fail                                                           |
| 10  | `/e2e-test-execution`      | Runs the full e2e suite for real; loops back to 6 on failure                                                                         |
| 11  | `/manual-testing`          | Gives the user a local URL to test; loops back to 6 on a reported bug, otherwise continues once confirmed complete (or not required) |
| 12  | `/deploy-branch`           | Pushes the branch, opens a PR, waits for all 9 CI jobs; loops back to 6 on any failing job                                           |
| 13  | `/deploy-main`             | Merges the PR, runs `/wiki-update`, deletes the branch/worktree                                                                      |
| 14  | `/post-deploy-report`      | Writes `reports/<change>.md`: requirements, solution, all bugs raised/resolved, time taken                                           |

**Loop-backs** all land back in `solution-implementation`, which checks `fields.resume_after_fix` in the workflow state to know which stage to resume once the fix is in, rather than restarting the whole downstream chain.

Each skill can also be run manually at any time by typing `/skill-name`.

**Resuming an interrupted workflow**: `node scripts/workflow-state.mjs get` shows the current stage; the next session picks up from there.

**Resetting the workflow**: `node scripts/workflow-state.mjs reset`.

### Without Claude (manual)

Run each step yourself:

```
node scripts/workflow-state.mjs start
node scripts/workflow-state.mjs set requirement_text "..."
node scripts/workflow-state.mjs approve requirement
node scripts/workflow-state.mjs set solution_text "..."
node scripts/workflow-state.mjs approve solution_design
node scripts/workflow-state.mjs approve solution_review
node scripts/workflow-state.mjs approve unit_test_write
node scripts/workflow-state.mjs approve unit_test_review
node scripts/workflow-state.mjs approve implementation
node scripts/workflow-state.mjs approve refactor
node scripts/workflow-state.mjs approve e2e_test_write
node scripts/workflow-state.mjs approve e2e_test_review
node scripts/workflow-state.mjs approve e2e_execution
node scripts/workflow-state.mjs approve manual_testing
node scripts/workflow-state.mjs approve deploy_branch
node scripts/workflow-state.mjs approve deploy_main
node scripts/workflow-state.mjs reset
```

To loop back a stage: `node scripts/workflow-state.mjs loopback <stage> "<reason>"`.

## Pull requests and CI

All changes land via a PR from a feature branch — `main` is protected and direct pushes are blocked by the `pre-push` hook (see `scripts/pre-push-check.mjs`). The same hook checks that unit tests, e2e tests, and manual testing are all signed off in the workflow state before a feature branch can be pushed.

CI (`.github/workflows/ci.yml`) runs 9 required jobs on every PR:

| Job                 | Tool                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                | ESLint (flat config) + Prettier                                                                                                                         |
| Build               | `vite build`                                                                                                                                            |
| Unit tests          | `vitest run`                                                                                                                                            |
| Coverage gate       | `vitest run --coverage` (80% lines/statements/functions, 70% branches)                                                                                  |
| E2E tests           | `playwright test`                                                                                                                                       |
| Accessibility tests | `@axe-core/playwright`                                                                                                                                  |
| Security audit      | `npm audit --omit=dev --audit-level=high` (production deps only — dev tooling isn't shipped)                                                            |
| PWA validation      | `scripts/check-pwa.mjs` — checks the built manifest, service worker, and `index.html` wiring (Lighthouse's `pwa` category was removed upstream in v10+) |
| Documentation check | `scripts/check-docs.mjs` — fails if `src/` changed without `CLAUDE.md`/`README.md` also changing                                                        |

The documentation-check job is a nudge, not a wiki editor — it can't run Claude inside GitHub Actions. The wiki itself is synced by `/wiki-update`, run locally as part of `/deploy-main`.

Any job failing blocks the merge and is logged as the matching `ci-*` bug (see the table above), closed once the job passes.

## Wiki updates

The [GitHub wiki](https://github.com/lauz9888/untangle/wiki) is updated as part of `/deploy-main`. It's a separate git repository (`untangle.wiki.git`) with no branch protection, pushed to directly.

To trigger a wiki review outside the deploy workflow (e.g. after a direct wiki edit), run `/wiki-update`.

## Key files

| File                                 | Purpose                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `src/composables/useTasks.js`        | Task logic, energy filtering, localStorage persistence                             |
| `src/composables/useEnergyLevel.js`  | Header energy-level selection state and toast message pools                        |
| `scripts/workflow-state.mjs`         | 14-stage pipeline state machine (`start`/`get`/`set`/`approve`/`loopback`/`reset`) |
| `scripts/bug-tracker.mjs`            | CLI for creating/closing GitHub bug issues, category list                          |
| `scripts/check-docs.mjs`             | CI documentation-check job                                                         |
| `scripts/pre-push-check.mjs`         | `pre-push` git hook logic (blocks direct `main` pushes, checks sign-off)           |
| `scripts/post-commit-close-bugs.mjs` | `post-commit` git hook logic (auto-closes bugs via commit trailers)                |
| `.claude/skills/`                    | The 14 pipeline skills plus `report-bug` and `wiki-update`                         |
| `.github/workflows/ci.yml`           | The 9-job CI pipeline                                                              |
| `reports/`                           | Post-deploy change reports, one markdown file per merged change                    |
