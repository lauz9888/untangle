# 0004. Adopt Storybook (via @storybook/addon-vitest) as a fourth test layer

Status: Accepted
Date: 2026-09-27

## Context

untangle's three existing test layers (unit/Vitest, BDD/Cucumber, e2e/Playwright — see
CLAUDE.md's "Test organisation") have no isolated, documented, visually-inspectable view of each
component's states independent of a full jsdom mount or a full browser app run. `.workflow/storybook/requirements.md`
asks for Storybook to fill that gap, reviewing all three existing layers for duplication once the
new layer exists (mirroring the earlier `.workflow/trim-bdd-duplication/` precedent).

Two decisions needed making that requirements.md left open:

1. **Headless/CI execution mechanism.** The classic `@storybook/test-runner` (a separate
   Playwright-based CLI that crawls a `build-storybook` static output, running each story's `play`
   function) vs. `@storybook/addon-vitest` (Storybook 9's Vitest-portable-stories integration,
   running each story as a real Vitest test, in Vitest's own browser mode via a Playwright
   provider).
2. **Story file location.** Co-located `Component.stories.ts` next to `Component.vue`, vs. a
   separate `tests/storybook/` tree mirroring `tests/unit/<feature>/`.

## Decision

Adopt `@storybook/addon-vitest`, not `@storybook/test-runner`, specifically because it produces
`@vitest/coverage-v8` output using the exact same provider/mechanism as the existing unit layer —
this lets `scripts/merge-coverage.mjs` fold it in as a fourth source with a one-line addition to
its `layers` array, instead of needing a bespoke coverage-instrumentation bridge the way BDD's
nyc/Istanbul step or e2e's v8-to-istanbul conversion each needed. It also reuses this repo's
already-installed `@playwright/test` Chromium binary (pinning a same-version `playwright` package
for Vitest's browser-mode provider) rather than a second, independently-managed browser
installation.

Story files are co-located (`src/components/Component.stories.ts`), not under `tests/storybook/`.
`tests/unit/<feature>/`'s directory shape exists specifically to pair `composable.test.ts` with
`components.test.ts` at feature-domain grain (CLAUDE.md's "Test organisation"); a story has no
composable counterpart to pair with, so mirroring that shape would be hollow structure without the
pairing rationale that motivates it. Co-location also matches Storybook's own ecosystem-wide
convention and its default `stories` glob, and keeps a story next to the component it documents so
it's less likely to go stale.

## Consequences

- `npm run test:storybook` (`vitest run --config vitest.storybook.config.ts`) becomes a required,
  independent command alongside `test:unit`/`test:bdd`/`test:e2e`, gated in CI the same way.
- `vi.mock`-based interaction tests inside `.stories.ts` files only behave as written when run via
  `test:storybook`; the plain interactive `npm run storybook` dev server renders the same files
  against the real singleton composables instead, since it doesn't run through Vitest's transform
  pipeline (documented as an accepted limitation, not a defect — see the design's Risks section).
- Adding a fifth `@storybook/*`-family devDependency set in future (e.g. a visual-regression addon)
  should revisit this ADR rather than being bolted on silently, per the same
  new-dependency/new-pattern trigger that prompted this one.
- If a future change needs Storybook stories composing more than one component together (this
  change deliberately keeps every story to exactly one component, matching `components.test.ts`'s
  own per-component mocking grain), that's a new decision, not an extension of this one.
