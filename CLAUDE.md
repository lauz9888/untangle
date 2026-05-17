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

## Key files

| File | Purpose |
|---|---|
| `src/composables/useTasks.js` | All task logic, energy filtering, localStorage persistence |
| `src/composables/useCelebration.js` | Celebration popup state and messages |
| `src/constants/energy.js` | Energy level definitions and column definitions |
| `src/components/TaskCard.vue` | Display and edit mode for a single task |
| `src/components/TaskColumn.vue` | Column with add-task form and drop zone |
| `tests/e2e/helpers.js` | Shared Playwright helpers (`addTask`, `taskCard`, `openEdit`) |
