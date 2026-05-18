# Untangle — Claude Code guide

## Dev server

```
npm run dev
```

Opens at `http://localhost:5173`. Vite's HMR reloads the browser on every save. A Claude Code hook in `~/.claude/settings.json` starts this automatically on the first file edit each session, so you usually don't need to run it manually.

## Tests

```
npm test           # unit tests (Vitest, watch mode)
npm run test:e2e   # end-to-end tests (Playwright, requires dev server running)
```

The E2E suite spins up its own dev server via `playwright.config.js`; you don't need to start one separately for it.

## Architecture in brief

All task state lives in `src/composables/useTasks.js` — a module-level singleton (Vue reactive refs outside the function). Every component that calls `useTasks()` shares the same state. `useCelebration.js` follows the same pattern for popup state.

Components are thin: they call composable functions and render results. Business logic stays in the composables.

## Test organisation

Unit tests in `tests/unit/<feature>/` always come in pairs:
- `composable.test.js` — resets the module between tests (`vi.resetModules()`) for fresh state
- `components.test.js` — mocks the composable entirely (`vi.mock(...)`) to isolate rendering

Don't mix the two styles in the same file — they're incompatible.

E2E tests in `tests/e2e/` clear `localStorage` and reload before every test so they're fully independent.

## QA review and pull requests

Before pushing a branch or creating a PR, QA review must pass. Run:

```
/qa-review
```

This skill reviews all changed code for logic issues, inefficiency, and maintainability problems; fixes what it finds; checks whether unit and e2e tests are needed and writes them if so; and updates README/CLAUDE.md if the change affects documented behaviour. When everything is clean it writes a QA approval marker for the current branch and commit.

The `pre-push` git hook and the Claude Code `PreToolUse` hook both enforce this — pushing or running `gh pr create` will be blocked if the marker is missing or stale (i.e. new commits were added after the last review).

To re-approve after adding commits, just run `/qa-review` again.

## Wiki updates

The [GitHub wiki](https://github.com/lauz9888/untangle/wiki) is updated automatically. When a PR is merged and main is pushed, a GitHub Actions workflow (`wiki-update.yml`) diffs the change against every wiki page and updates any that are out of date. It requires `ANTHROPIC_API_KEY` to be set as a repository secret.

For direct pushes to main, run `/wiki-update` in Claude Code to trigger the same review manually.

## Key files

| File | Purpose |
|---|---|
| `src/composables/useTasks.js` | All task logic, energy filtering, localStorage persistence |
| `src/composables/useCelebration.js` | Celebration popup state and messages |
| `src/constants/energy.js` | Energy level definitions and column definitions |
| `src/components/TaskCard.vue` | Display and edit mode for a single task |
| `src/components/TaskColumn.vue` | Column with add-task form and drop zone |
| `tests/e2e/helpers.js` | Shared Playwright helpers (`addTask`, `taskCard`, `openEdit`) |
