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

Bugs are tracked as GitHub issues whenever they are identified, regardless of the process that found them. Every issue records which process detected the bug — both in the issue body (`**Detected by:**`) and as a GitHub label (`found:development`, `found:qa`, `found:ci`, or `found:manual`) so issues can be filtered by detection process.

| Process | Source value | How issues are created | How issues are closed |
|---|---|---|---|
| Development | `development` | Create before fixing with `--source development` (see below) | Include `Fixes #N` in the commit message |
| QA review (`/qa-review`) | `qa-review` | Created for each bug found, before fixing | Closed with root cause + fix details after the fix |
| Unit / E2E test failures (during QA) | `unit-test` / `e2e-test` | Created when a test fails due to a source bug | Closed after the source fix is applied |
| CI pipeline | `ci-unit-tests` / `ci-e2e-tests` | Created automatically on any test job failure | Include `Fixes #N` in a commit message |
| Manual report | `manual` | Run `/report-bug` and describe what you saw | Include `Fixes #N` in a commit message |

**Reporting a development-time bug**: if you spot a bug in existing code while implementing a feature (before the QA step), create an issue before fixing it:

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <concise description>" \
  --body "<what the bug is, which file and line, how it manifests>" \
  --source "development"
```

Then fix the bug and include `Fixes #N` in the commit message to close the issue automatically.

**Auto-close via commit message**: any commit whose message contains `Fixes #N`, `Closes #N`, or `Resolves #N` triggers the `post-commit` hook, which comments on the issue with the fix summary and closes it.

The core script is `scripts/bug-tracker.mjs` — it handles deduplication (won't create a second issue if one with the same title is already open).

## QA review and pull requests

Before pushing a branch or creating a PR, QA review must pass. Run:

```
/qa-review
```

This skill reviews all changed code for logic issues, inefficiency, and maintainability problems; fixes what it finds; checks whether unit and e2e tests are needed and writes them if so; and updates README/CLAUDE.md if the change affects documented behaviour. When everything is clean it writes a QA approval marker for the current branch and commit.

The `pre-push` git hook and the Claude Code `PreToolUse` hook both enforce this — pushing or running `gh pr create` will be blocked if the marker is missing or stale (i.e. new commits were added after the last review).

To re-approve after adding commits, just run `/qa-review` again.

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
