```metrics
tracking_issue: 179
started_at: 2026-11-10T23:09:01Z
completed_at: 2026-11-11T15:02:21Z
total_hours: 15.9
coverage_percent: 97.03
storybook_story_count: 48
storybook_interaction_test_count: 35
storybook_a11y_pass_rate: 48/48 stories
outcome: merged-deployment-failed
bugs_by_stage:
  requirement: 0
  design: 8
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  storybook-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 1
  ci: 0
  cd: 1
bugs_by_category:
  security: 0
  accessibility: 0
```

# storybook-interactive-mocks (fixes #178, tracking #179, PR #189)

Merge commit: `9fe8b7abba393209d70223d9a2472602d5bd8c68`.

## Requirements

Issue #178: in `npm run storybook` (port 6006), `.storybook/main.ts` aliased `vitest`/`vitest/browser` to no-op stubs (the bug #141 fix). Each story's module-scope `vi.mock(...)` and `vi.fn()` spies therefore did nothing interactively. Data-dependent stories rendered empty or blank state, spy assertions saw 0 calls, and the Interactions tab showed red failures across the catalogue.

Approved requirements (12, plus accessibility baseline A1/A2):

- Every data-dependent story renders its seeded state interactively, with no reliance on real `localStorage`.
- Every `play` function passes in the interactive view.
- `npm run test:storybook` keeps at least 48 passing tests with no weakened assertions.
- Mock state is seeded per story and does not leak between stories.
- Stories stop depending on the `vitest` stubs. Any remaining alias stays gated so the #141 hang cannot regress.
- `build-storybook` and the `storybook-tests` CI job stay green.
- No `src/` runtime behaviour change. The scope was amended on 2026-11-11, with user approval, to allow test-only `src/**/__mocks__/` redirect files plus the coverage-exclude config they need (design issue #180).
- addon-a11y keeps scanning every story with the WCAG scope.
- Coverage stays at or above the threshold.
- Typecheck, ESLint and Prettier pass.
- `CLAUDE.md`, ADRs and the wiki drop the "accepted limitation" text.
- A repeatable, CI-wired check that the interactive view is healthy.

## Solution

The design replaced per-file `vi.mock`/`vitest` imports with Storybook 9 module mocking (`sb.mock`), registered centrally in `.storybook/preview.ts`. It covers 7 composables: `useAddTaskModal`, `useCelebration`, `useCompletedPanel`, `useEnergyLevel`, `useSectionCollapse`, `useTaskDetail` and `useTasks`.

- The design verified the mechanism against the installed Storybook 9.1.20 with spikes, and it works in both the interactive view and `addon-vitest`.
- Modules whose non-function exports components consume (`ENERGY_LEVEL_OPTIONS`, `SECTION_DEFS`) use manual `src/composables/__mocks__/` redirects. In the static/interactive runtime, `spy: true` empties array exports.
- Stories use `fn`/`expect`/`within`/`userEvent` from `storybook/test`. The six `page` imports from `vitest/browser` were replaced with viewport globals and parameters.
- `@storybook/test-runner` was rejected: only 0.22/0.23 support Storybook 9, and it is heavy. A custom Playwright check over the static build replaced it. It uses the already-installed `@playwright/test`, adds no dependency, and listens on the Storybook channel for render versus play-failure events. It runs on port 6017 because 6007 was occupied.
- An ESLint `no-restricted-imports` rule bans `vitest` and `vitest/browser` in `*.stories.ts`.
- A `pretest:storybook:interactive` hook installs Chromium, and the CI step is named "Interactive Storybook check".
- The check is a step inside the existing `storybook-tests` job, so no new job and no branch-protection change were needed.
- ADR renumbered to 0008 after merging main.

## Test changes

- Unit: `tests/unit/storybook-mocks/composable.test.ts` covers mock-module parity with the real composables, following the composable.test.ts pairing convention. No jest-axe scan, because there is no new DOM.
- BDD: none. The design found no journey needing new coverage.
- E2E: no app e2e changes. The new interactive-view check is `tests/storybook-interactive/interactive.spec.ts`, with `playwright.storybook.config.ts` and `scripts/serve-static.mjs`. It loads each story from `index.json` in a real Chromium against the static build and fails on any `playFunctionThrewException`, `storyErrored`, `storyThrewException` or `storyMissing` event (52 checks at last run).
- Storybook: all 16 `src/components/*.stories.ts` files were migrated off `vitest`. There are 48 stories, 35 with a `play` function. Each is scanned by `@storybook/addon-a11y` (WCAG scope, `color-contrast` enabled) under `test:storybook`, and 48/48 pass.
- Final suite counts at Step 9-11a: unit 429, BDD 14, e2e 176, Storybook 48, interactive 52.

## Accessibility

This change adds no UI, so coverage is preservation.

- A1: addon-a11y still scans every story (48/48 pass) with the WCAG tags from the single source in `.storybook/preview.ts`.
- A2: stories that were previously blank interactively, such as TaskDetailModal and NowNextLaterBoard, now render populated states and are covered by the same scan.
- No issues carry the `accessibility` label.

## Bugs raised

Design (8 issues, all opened 2026-11-10T23:47Z and closed 2026-11-11T05:59Z; found in solution review cycle 1 and resolved in cycle 2):

- #180: req 7 deviation. `__mocks__` files and the `vite.config.ts` coverage-exclude fell outside the allowed scope. Resolved by naming the deviation in the design and amending req 7 through the human gate.
- #181: viewport handling relied on unverified preview internals. Resolved with a spec-local viewport map as the primary mechanism, asserted against `index.json`.
- #182: the `?actual` re-export was unverified, and the parity-test fallback broke test conventions. Resolved with literal copies plus a parity test that follows the pairing convention.
- #183: no enforceable guard against `vitest` imports, and no explicit hang-timeout acceptance step. Resolved with the ESLint rule and an explicit time-bounded `test:storybook` acceptance step.
- #184: the CI step lacked a Chromium pre-hook and a distinct name. Resolved with `pretest:storybook:interactive` and the "Interactive Storybook check" step.
- #185: spec rule 4 let unbound spy hooks fall back to the real `localStorage` singleton. Resolved by requiring an unconditional bind or a redirect mock that fails loudly.
- #186: migration scope was ambiguous (15 versus 16 files). Resolved by naming the unmocked file and confirming it has zero `vitest` imports.
- #187: unverified whether eslint/prettier ignore `storybook-static/`. Resolved by checking and recording it.

Manual-test (1 issue):

- #188: opened 2026-11-11T06:48:00Z, closed 2026-11-11T07:00:03Z. Clicking "Run tests" in the Storybook sidebar crashed the dev server ("Failed to start Vitest"). Fixed in commit 6030fab, suites green, and the user's manual retest passed.

CD (1 issue):

- #200: opened 2026-11-11T14:45:50Z, still OPEN. The CD `E2E tests (live deployment)` job failed before running any tests, because `playwright install --with-deps chromium` hit a runner DNS failure ("Temporary failure resolving 'security.ubuntu.com'"). Build, deploy, smoke check and PWA validation all succeeded. A user-approved re-run failed the same way. It looks like transient runner networking rather than a defect in the change, and per pipeline policy it was logged and not auto-fixed.

## Coverage

Combined statement coverage is 97.03%, with branches at 95.61%, after merging main's accurate-coverage-merge change. It is above the 90% threshold.

## Outcome

`merged-deployment-failed`. The change is merged and the site deployed (build, deploy, smoke and PWA checks passed), but the post-deploy live e2e job failed twice on runner DNS before running any tests. See CD-failure issue #200 (open).

## Time taken

15.9 hours (2026-11-10T23:09:01Z to 2026-11-11T15:02:21Z). This spans human wait time too (requirements and manual-test approvals, review turnaround, CI and CD wait), not just active engineering time.
