# 0007. Storybook `sb.mock` module mocking and a Playwright interactive-view check

Status: Accepted
Date: 2026-11-10

## Context

Stories used `vi.mock` and `vitest` imports. Under `storybook dev`/`build` those were made inert by
Vite aliases to stubs (bug #141), so mocked-composable stories rendered against the real singleton
composables and many `play` functions failed interactively (issue #178), while `test:storybook`
passed.

Alternatives considered: decorators/`provide` (needs app source changes); calling the real
singletons and spying (writes real `localStorage`, and `useEnergyLevel()` returns a fresh literal so
spies are not shared); keeping the stubs (`vi.mock` stays a no-op interactively);
`@storybook/test-runner` for the check (only 0.23.x supports Storybook 9.1, and it adds a second
jest/browser toolchain that ADR 0004 already declined).

## Decision

- Mock composables with Storybook 9's global, static `sb.mock` registrations in
  `.storybook/preview.ts`. Function-only modules use `{ spy: true }`; modules whose non-function
  exports components consume (`useEnergyLevel`, `useSectionCollapse`) use manual redirects in
  `src/composables/__mocks__/`, as do `useTasks`/`useTaskDetail` so an unbound call fails loudly.
- Stories import `fn`, `expect`, `mocked`, etc. from `storybook/test`, bind hooks with
  `mocked(useX).mockReturnValue(state)` in meta `beforeEach`, and set mobile sizes through
  `globals.viewport` (options in `.storybook/viewports.ts`). `vitest`/`vitest/browser` imports in
  stories are a lint error; the stubs and aliasing in `.storybook/main.ts` are deleted.
- A Playwright spec over the static build (`npm run test:storybook:interactive`, a step of the
  `storybook-tests` CI job) fails on any render or play error event.

## Consequences

- Mocks are global, not per file: every story must bind each mocked hook in its component tree.
- `spy: true` empties arrays in the Storybook browser runtime, so constants need `__mocks__`
  redirects; the mock file is inlined at the mocked module's path, so its relative imports resolve
  from `src/composables/`. Duplicated constants are guarded by a unit drift test.
- `__mocks__` files live under `src/` by convention and are excluded from coverage.
- Revisit the test-runner choice on a Storybook 10 upgrade (0.24+ then supported).
