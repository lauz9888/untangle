# Untangle — Claude Code guide

## Dev server

```
npm run dev
```

Opens at `http://localhost:5173`. Vite's HMR reloads the browser on every save. A Claude Code hook in `~/.claude/settings.json` starts this automatically on the first file edit each session, so you usually don't need to run it manually.

## Tests

```
npm test                # unit tests (Vitest, watch mode)
npm run test:coverage   # unit tests with v8 coverage report (requires @vitest/coverage-v8)
npm run test:e2e        # end-to-end tests (Playwright, requires dev server running)
```

The E2E suite spins up its own dev server via `playwright.config.js`; you don't need to start one separately for it.

## Architecture in brief

All task state lives in `src/composables/useTasks.js` — a module-level singleton (Vue reactive refs outside the function). Every component that calls `useTasks()` shares the same state. `useCelebration.js`, `useEncouragement.js`, `useToughLove.js`, and `useStreak.js` follow the same singleton pattern.

Components are thin: they call composable functions and render results. Business logic stays in the composables.

## Test organisation

Unit tests in `tests/unit/<feature>/` always come in pairs:
- `composable.test.js` — resets the module between tests (`vi.resetModules()`) for fresh state
- `components.test.js` — mocks the composable entirely (`vi.mock(...)`) to isolate rendering

Don't mix the two styles in the same file — they're incompatible.

E2E tests in `tests/e2e/` clear `localStorage` and reload before every test so they're fully independent.

## Bug tracking

Bugs are tracked as GitHub issues whenever they are identified, regardless of where they're found. Every issue records which process detected it — in the issue body (`**Detected by:**`) and as a GitHub label — so issues can be filtered by detection process.

In all cases, run `/report-bug` to log an issue. When triggered by a workflow skill it happens automatically; when you find a bug manually, run it yourself.

| Where the bug was found | Source value | How issues are created | How issues are closed |
|---|---|---|---|
| During code writing (`/solution-implementation`) | `development` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| During code review (`/implementation-analysis`) | `qa-review` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| Unit test failure (`/unit-test-analysis`) | `unit-test` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| E2E test failure (`/e2e-test-analysis`) | `e2e-test` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| CI unit test failure (`/deploy-branch`, `/deploy-main`) | `ci-unit-tests` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| CI e2e test failure (`/deploy-branch`, `/deploy-main`) | `ci-e2e-tests` | `/report-bug` triggered automatically | Closed by `/report-bug` after fix |
| Developer finds a bug at any point | `manual` | Run `/report-bug` and describe what you saw | Closed by `/report-bug` after fix, or via `Fixes #N` in a commit |

**Auto-close via commit message**: any commit whose message contains `Fixes #N`, `Closes #N`, or `Resolves #N` triggers the `post-commit` hook, which comments on the issue with the fix summary and closes it.

The core script is `scripts/bug-tracker.mjs` — it handles deduplication (won't create a second issue if one with the same title is already open).

## Developer workflow

Every code change — whether made with Claude or manually — follows a structured pipeline. The skills are stored in `.claude/skills/` and available to all developers who clone the repo.

### With Claude (automated)

When you send Claude a message asking for a code change, the workflow starts automatically. Each step chains to the next without needing manual commands:

| Step | Skill | What it does |
|---|---|---|
| 1 | `/requirement-analysis` | Captures and validates requirements; asks clarifying questions |
| 2 | `/solution-analysis` | Designs the implementation approach; explores the codebase |
| 3 | `/solution-implementation` | Writes the code |
| 4 | `/implementation-analysis` | Verifies the code matches the requirement and solution |
| 5 | `/unit-test-analysis` | Updates unit tests and runs affected tests |
| 6 | `/e2e-test-analysis` | Updates e2e tests and runs affected tests |
| 7 | `/document-analysis` | Updates docs, then asks about deployment path |
| 8a | `/deploy-branch` | Deploys to a branch for manual testing |
| 8b | `/deploy-main` | Runs full CI and merges to main |
| 9 | `/post-deploy-report` | Generates a change report (summary + bug analysis) and commits it to `reports/` |

Each skill can also be run manually at any time by typing `/skill-name`.

**Loop-backs**: if implementation or analysis discovers a gap, the workflow automatically routes back to an earlier step with full context, then resumes forward from there.

**Resuming an interrupted workflow**: if a session is interrupted mid-workflow, the next Claude session detects the active state and offers to resume from where it left off.

**Resetting the workflow**: if you want to start fresh:
```
node scripts/workflow-state.mjs reset
```

### Without Claude (manual)

Run each step yourself and use these commands to advance the workflow:

```
node scripts/workflow-state.mjs start               # begin a new workflow
node scripts/workflow-state.mjs set requirement_text "..."
node scripts/workflow-state.mjs approve requirement  # advance to solution-analysis
node scripts/workflow-state.mjs set solution_text "..."
node scripts/workflow-state.mjs approve solution     # advance to solution-implementation
node scripts/workflow-state.mjs set implementation_summary "..."
node scripts/workflow-state.mjs set pending_next_step "implementation-analysis"
node scripts/workflow-state.mjs approve implementation  # advance to unit-test-analysis
node scripts/workflow-state.mjs approve unit-tests   # advance to e2e-test-analysis
node scripts/workflow-state.mjs approve e2e-tests    # advance to document-analysis
node scripts/workflow-state.mjs approve docs         # advance to deploy
node scripts/workflow-state.mjs reset                # clear state after deploy
```

Check current state at any time:
```
node scripts/workflow-state.mjs get
```

## QA review and pull requests

A QA approval marker must exist before pushing a branch or creating a PR. How it gets written depends on which workflow path you're on:

**Automated workflow** (`/requirement-analysis` → … → `/deploy-main`): the marker is written automatically by `/deploy-main` after all CI checks pass. You do not need to run `/qa-review` separately.

**Manual workflow** (code written outside the automated pipeline): run `/qa-review` before pushing.

```
/qa-review
```

This reviews all changed code for logic issues, inefficiency, and maintainability problems; fixes what it finds; checks whether unit and e2e tests are needed and writes them if so; and updates README/CLAUDE.md if the change affects documented behaviour. When everything is clean it writes the QA approval marker.

To re-approve after adding commits, run `/qa-review` again.

The `pre-push` git hook and the Claude Code `PreToolUse` hook both enforce the marker — pushing or running `gh pr create` will be blocked if it is missing or stale.

**Working without Claude Code?** Run the manual equivalent instead:

```
sh scripts/mark-qa-approved.sh        # unit tests + writes marker
sh scripts/mark-qa-approved.sh --e2e  # also runs E2E tests
```

This runs the test suite and writes the same approval marker. You are responsible for the code review itself — the script only verifies the tests pass.

## Wiki updates

The [GitHub wiki](https://github.com/lauz9888/untangle/wiki) is updated automatically. When a PR is merged and main is pushed, a GitHub Actions workflow (`wiki-update.yml`) diffs the change against every wiki page and updates any that are out of date. It requires `ANTHROPIC_API_KEY` to be set as a repository secret.

For direct pushes to main, run `/wiki-update` in Claude Code to trigger the same review manually.

## Key files

| File | Purpose |
|---|---|
| `src/composables/useTasks.js` | All task logic, energy filtering, localStorage persistence |
| `src/composables/useStreak.js` | Streak counter logic, exclusion rules, settings persistence |
| `src/composables/useCelebration.js` | Celebration popup state and messages |
| `src/constants/energy.js` | Energy level definitions and column definitions |
| `src/components/TaskCard.vue` | Display and edit mode for a single task |
| `src/components/TaskColumn.vue` | Column with add-task form and drop zone |
| `tests/e2e/helpers.js` | Shared Playwright helpers (`addTask`, `taskCard`, `openEdit`) |
| `scripts/bug-tracker.mjs` | CLI for creating and closing GitHub bug issues |
| `reports/` | Post-deploy change reports, one markdown file per merged PR |
