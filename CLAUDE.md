# Untangle — Claude Code guide

## Dev server

```
npm run dev
```

Opens at `http://localhost:5173`. Vite's HMR reloads the browser on every save. A Claude Code hook in `~/.claude/settings.json` starts this automatically on the first file edit each session, so you usually don't need to run it manually.

## Tests

```
npm run test:unit           # unit tests (Vitest)
npm run test:bdd            # BDD tests (Cucumber.js)
npm run test:e2e            # end-to-end tests (Playwright, requires dev/build+preview server)
npm run test:coverage:merge # combined coverage % across all three layers (threshold in .claude/STANDARDS.md)
```

`playwright.config.ts` builds and serves the app itself (`npm run build && npm run preview`) before running e2e tests, so you don't need a separate server running.

## Architecture in brief

All task state lives in `src/composables/useTasks.js` — a module-level singleton (Vue reactive refs outside the function). Every component that calls `useTasks()` shares the same state. Follow the same singleton pattern for any other cross-component state.

`src/composables/useEnergyLevel.ts` follows the same singleton pattern for the header's energy-level selector (`src/components/EnergySelector.vue`, grouped in its own labeled panel), the standalone "Encourage me" and "Tough love" buttons (`src/components/EncourageButton.vue`, `src/components/ToughLoveButton.vue`), and their shared toast notification (`src/components/ToastNotification.vue`): selecting a Low/Medium/High level picks a random encouraging message from a 20-message-per-level pool, the "Encourage me" button picks one from a separate 50-message general pool, and the "Tough love" button picks one from its own separate 50-message pool of firmer, more pressing (but not harsh or shaming) messages — either way showing it as a toast that auto-dismisses after a few seconds or can be closed manually. Selection is in-memory only and always resets to "none" on reload.

Components are thin: they call composable functions and render results. Business logic stays in composables.

The header, energy panel, Encourage me button, Tough love button, and toast are mobile-responsive: a `@media (max-width: 640px)` block in each component's scoped `<style>` stacks the header vertically, gives interactive controls a ~44px minimum tap target, and keeps the toast within the viewport with its close button pinned to the right edge (`justify-content: space-between`, since the toast's explicit mobile `width` is usually wider than its content). Follow the same `<=640px` breakpoint and pattern for any new interactive UI.

The codebase is TypeScript (`<script setup lang="ts">` in `.vue` files, `.ts` for composables/scripts). Type-check with `npm run typecheck` (`vue-tsc`, not plain `tsc` — bare `tsc` doesn't understand `.vue` SFCs).

## Test organisation

Three layers, each covering behavior at a different grain:

- **Unit** (`tests/unit/<feature>/`) always comes in pairs:
  - `composable.test.ts` — resets the module between tests (`vi.resetModules()`) for fresh state
  - `components.test.ts` — mocks the composable entirely (`vi.mock(...)`) to isolate rendering, mounted with `@vue/test-utils`
  - Don't mix the two styles in the same file — they're incompatible.
  - `jest-axe` (registered in `vitest.setup.ts`) scans each meaningfully distinct DOM state of any new/changed component, scoped to the WCAG tags in `.claude/STANDARDS.md`, with `color-contrast` disabled (jsdom can't evaluate it).
- **BDD** (`features/**/*.feature`, step definitions in `features/step_definitions/`, shared setup in `features/support/`) describes user-observable behavior in Gherkin at a coarser grain than unit tests — typically driving a composable or mounted component through a scenario without a full browser.
- **E2e** (`tests/e2e/`) clears `localStorage` and reloads before every test so they're fully independent. Shared helpers live in `tests/e2e/helpers.js`. `@axe-core/playwright` (`tests/e2e/a11y.spec.ts`) covers color-contrast and other checks that need a real browser, scoped to the same WCAG tags.

`scripts/merge-coverage.mjs` (`npm run test:coverage:merge`) combines all three layers' coverage into one statement-coverage percentage — this is the number gated in CI and by `qa-reviewer` (threshold in `.claude/STANDARDS.md`, currently 90%).

## Bug tracking

Bugs are filed as GitHub issues by whichever pipeline stage or CI job first finds them. `.claude/skills/ship-feature/SKILL.md`'s "Bug tracking" convention is the source of truth: `gh issue create --label <label> --title "<slug>: <short summary>" --body "<detail>\n\nRelated to #<tracking-issue>"`, closed with `gh issue close <n> --comment "<what fixed it>"` once the matching check is green again. Labels in use: `requirement`, `design`, `unit-test`, `bdd-test`, `e2e-test`, `qa`, `manual-test`, `deploy-path`, `ci`, `accessibility`, `security`.

## Developer workflow

Every change — feature, fix, or refactor — runs through the `/ship-feature` pipeline (`.claude/skills/ship-feature/SKILL.md`) rather than being made ad hoc. It's a single orchestrator skill that drives 11 specialized subagents via the `Agent` tool; the orchestrator handles all git/gh/file work and all direct user interaction, subagents read/write files and hand back a `STATUS:` line.

Invoke with the change request as the argument: `/ship-feature add a dark mode toggle to settings`. See the [wiki](https://github.com/lauz9888/untangle/wiki) for a narrative walkthrough of the full pipeline; the table below and `.claude/skills/ship-feature/SKILL.md`/`.claude/agents/*.md` are this file's own (more mechanical) reference.

| Step  | What happens                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Intake — the request itself                                                                                                                                                                            |
| 2     | **Requirements** (human gate) — `requirements-analyst` drafts `requirements.md`; loops on your questions/feedback until you approve; opens the tracking issue                                          |
| 3     | **Solution design + review loop** — `solution-designer` drafts `design.md`, `solution-reviewer` checks it against requirements/codebase/testability/accessibility/ADR triggers, looping until approved |
| 4     | **Branch** — `feature/<slug>` off `main`                                                                                                                                                               |
| 5–7   | **Unit / BDD / e2e tests (red)** — each test-author agent writes tests first and confirms they fail for the right reason                                                                               |
| 8     | **Implementation** — `implementer` makes the scoped tests green                                                                                                                                        |
| 9–11  | **Full unit / BDD / e2e suites + bug-fix loop** — any failure is filed as an issue, `bug-fixer` resolves it, loop until green                                                                          |
| 12    | **QA review + coverage gate** — `qa-reviewer` checks quality/security/accessibility and combined coverage (`.claude/STANDARDS.md` threshold), routing gaps back to the right stage                     |
| 13    | **Base-path smoke check** — full e2e suite re-run against a local build using the production `GITHUB_PAGES=true` base path, to catch CD-only path bugs before merge                                    |
| 14    | **Manual test gate** (human gate) — local URL, your sign-off; any bug you report loops back to implementation                                                                                          |
| 15    | **Merge to main** — PR opened, pushed, triggering CI                                                                                                                                                   |
| 16–17 | **CI / CD** — watched via `gh pr checks --watch`                                                                                                                                                       |
| 18    | **CI bug-fix loop** — any failing job filed + fixed, capped at 5 cycles; merges once green (`gh pr merge --squash --delete-branch`)                                                                    |
| 19    | **CD failure logging** — logged, not auto-fixed (per pipeline spec)                                                                                                                                    |
| 20    | **Documentation update** — `docs-updater` reconciles `CLAUDE.md`/`README.md`/wiki, committed straight to `main`                                                                                        |
| 21    | **Post-change report** — `report-generator` writes `reports/<YYYY-MM-DD>-<slug>.md`                                                                                                                    |
| 22    | **Cleanup** — branch deletion confirmed/completed                                                                                                                                                      |

**Retry caps.** Every loop (design review, per-layer red/green, QA, manual-test, CI) is capped at 5 iterations; past that, the orchestrator asks you how to proceed rather than looping forever.

**State & resuming.** Everything for one run lives in gitignored `.workflow/<slug>/` (`requirements.md`, `design.md`, `state.md`, `meta.json`) — plain markdown/JSON, not a script-managed state machine. Invoking `/ship-feature` with no clear new request looks for an incomplete run under `.workflow/*/state.md` and resumes it from its recorded step.

Each subagent can also be inspected or driven directly via the `Agent`/`SendMessage` tools if you need to intervene mid-run — see `.claude/agents/*.md` for each one's exact contract.

## Pull requests and CI

All changes land via a PR from a feature branch — `main` is protected on GitHub (branch protection, not a local hook). CI (`.github/workflows/ci.yml`) runs 9 required jobs on every PR:

| Job               | Tool                                                                           |
| ----------------- | ------------------------------------------------------------------------------ |
| Install & build   | `vite build`                                                                   |
| Type check        | `vue-tsc --noEmit`                                                             |
| Lint              | ESLint (flat config)                                                           |
| Unit tests        | `vitest run`                                                                   |
| BDD tests         | `cucumber-js`                                                                  |
| Format check      | Prettier                                                                       |
| Dependency audit  | `npm audit --omit=dev --audit-level=high` (production deps only)               |
| E2E tests         | `playwright test` (local build/preview)                                        |
| Combined coverage | `scripts/merge-coverage.mjs`, gated at the threshold in `.claude/STANDARDS.md` |

Any job failing blocks the merge and is logged as the matching `ci` bug (see "Bug tracking" above), closed once the job passes.

## Deployment

Merges to `main` are built and published to GitHub Pages by `.github/workflows/cd.yml`, live at [lauz9888.github.io/untangle](https://lauz9888.github.io/untangle/). The build sets `GITHUB_PAGES=true` so `vite.config.ts` serves assets under the `/untangle/` base path a GitHub Pages project site needs (local dev/build/preview are unaffected — they default to `/`). After deploy, `cd.yml` runs a post-deploy smoke check (site responds 200), a PWA validation check (manifest + service worker are served), and the full e2e suite against the live URL (`e2e-live`, reusing `test:e2e` with `BASE_URL` set). This is a separate workflow from `ci.yml`; it doesn't gate PRs, it only runs after a merge lands on `main`.

## Wiki updates

The [GitHub wiki](https://github.com/lauz9888/untangle/wiki) is a separate git repository (`untangle.wiki.git`) with no branch protection, reconciled by the `docs-updater` subagent as pipeline Step 20. To trigger a wiki review outside a pipeline run (e.g. after a direct wiki edit), invoke `Agent(subagent_type="docs-updater")` directly with the diff/context you want reconciled.

## Key files

| File                                   | Purpose                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/composables/useTasks.js`          | Task logic, energy filtering, localStorage persistence                                                                  |
| `src/composables/useEnergyLevel.ts`    | Header energy-level selection state, "Encourage me"/"Tough love" toasts, and message pools                              |
| `.claude/skills/ship-feature/SKILL.md` | The 22-step pipeline orchestrator                                                                                       |
| `.claude/agents/`                      | The 11 subagents the orchestrator drives (requirements, design, test-authors, implementer, bug-fixer, QA, docs, report) |
| `.claude/STANDARDS.md`                 | Shared cross-cutting values: WCAG scope, coverage threshold, Node version, security checklist                           |
| `scripts/merge-coverage.mjs`           | Combines unit + BDD + e2e coverage into one percentage                                                                  |
| `docs/adr/`                            | Architecture Decision Records, added by `solution-designer` when a design introduces one                                |
| `.github/workflows/ci.yml`             | The 9-job CI pipeline                                                                                                   |
| `.github/workflows/cd.yml`             | Builds and publishes `main` to GitHub Pages after merge, then smoke/PWA/live-e2e checks                                 |
| `reports/`                             | Post-change reports, one dated markdown file per merged change                                                          |
