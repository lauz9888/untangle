# 0007. Single statement universe and Istanbul-instrumented e2e for combined coverage

Status: Accepted
Date: 2026-11-11

## Context

The combined coverage figure from `npm run test:coverage:merge` was inaccurate in two ways.

1. **The e2e leg was fake.** It converted Playwright's V8 `page.coverage` output with
   `v8-to-istanbul` over a minified production bundle. Investigation showed the raw V8 entry does
   contain block-level data (708 functions, 188 with more than one range, `isBlockCoverage: true`),
   but the bundle is only 19 physical lines. `v8-to-istanbul` applies a range's count to a source
   line only when the range spans the entire line, so no `count 0` sub-range ever applied and only
   the script-wide `count 1` root range did. Mapped through the sourcemap, that gave exactly one
   hit-count value (`1`) across all 27 `src/` files, empty `fnMap`/`branchMap`, and statements for
   every line of a `.vue` file including `<template>`, `<style>` and comments (`AddTaskModal.vue`:
   601 statements vs 72 real ones).
2. **Cross-provider double counting.** `FileCoverage.merge` keys by exact location. Unit and
   Storybook (Vitest 4's v8 provider, which is AST-based via `ast-v8-to-istanbul`) and BDD
   (nyc/ts-node Istanbul) place the same statement or branch at different locations, so statements
   were inflated and naive branch coverage read 78.86%.

Further findings: Istanbul layers drop the implicit `else` arm of an `if` (1 arm vs 2 in the
AST-based layers), and `.vue` template-derived branch locations differ between the production and
development SFC compiles.

## Decision

- **e2e via Istanbul.** Under `COVERAGE=true` only, `vite.config.ts` dynamically imports
  `vite-plugin-istanbul` and instruments `src/`. The fixture reads `window.__coverage__`; counters
  survive reloads through a synchronous `sessionStorage` flush on `pagehide`/`visibilitychange`, are
  summed in Node (`addCounters`), and `global-teardown.ts` merges and remaps them to original-source
  coordinates with `istanbul-lib-source-maps`.
- **Single universe.** `scripts/lib/coverage-merge.mjs` no longer cross-merges raw maps. It builds
  one statement/branch/function universe from the unit and Storybook layers (keyed by file + start
  line + kind + ordinal) and credits BDD and e2e hits onto keys that already exist. Branch arms are
  credited by index only when arm counts are equal or (for `if`) the secondary has exactly one fewer
  arm; otherwise the item is skipped and tallied.
- **Gate both statements and branches at 90%**, mirrored in `ci.yml` and `.claude/STANDARDS.md`.
- **Runtime, unit-tested guards:** flat-e2e detection (`assertE2eLayerIsReal`), e2e `.vue` template
  parity (`assertE2eTemplateParity`), universe completeness against `src/**/*.{ts,vue}` on disk
  (`assertUniverseComplete`) and an independent dedupe recount (`assertDedupeEffective`). A missing
  layer file throws (`loadLayers`).
- The requirement that `<template>` markup is not counted as statements is enforced by the
  count-parity rule of `assertE2eTemplateParity` (e2e statement count may not exceed the unit
  layer's by more than max(2, 10%)); its line-content check covers `<style>`, blank and
  comment-only lines.

### Universe scope and dropped items

`src/main.ts` is intentionally outside the universe (excluded from unit/Storybook coverage by
`vite.config.ts`'s `test.coverage.exclude`; one statement of bootstrap). Secondary-layer entries for
it are ignored, and `UNIVERSE_EXCLUDES`/`assertUniverseComplete` encode the exclusion list. The
secondary-only items that are dropped are pipeline artefacts, not real untested code: BDD's are
ts-node CommonJS-emit artefacts attributed to `import ...` and `export function ...` lines which the
AST-based layers do not treat as statements; e2e's are the production compile's differing `.vue`
template branch locations. Because the universe covers every real statement the AST providers
enumerate, dropping them cannot hide an uncovered line; the ignored-items tally printed on every run
keeps the volume visible.

## Alternatives considered

- V8 over an unminified build: `v8-to-istanbul` with a sourcemap yields no function/branch data and
  is still generated-line granularity.
- Keeping `v8-to-istanbul` and patching it: the line-containment rule is inherent.
- `nyc report` for the e2e remap: its default extension list excludes `.vue`.
- Naive `FileCoverage.merge` of raw maps: position mismatch (see Context).
- Switching unit/Storybook to `@vitest/coverage-istanbul`: would not align BDD (ts-node) or the
  production-compiled `.vue`, so de-duplication is still needed, plus a provider swap.
- Union of all layers' items: inflates the branch denominator (684 to 764) with unalignable `.vue`
  template branches.
- Crediting branch arms by index unconditionally: mis-credits a `switch`.
- `exposeFunction` IPC for e2e counters: can lose the final payload on page teardown, making the
  figure nondeterministic.
- Statement-only gating: branch coverage had been silently unmeasured.

## Consequences

- Figures are now trustworthy and differ from earlier ones (statements lower than the old inflated
  96.73%; branches newly reported). This is not a regression.
- The ordinal heuristic can mis-attribute hits when layers disagree on the number of items on a
  line (accepted, bounded).
- `.vue` template-derived branches are credited only through unit/Storybook.
- A test that crashes before the fixture's final `page.evaluate` loses that test's e2e counters
  (under-count only).
- Adds `vite-plugin-istanbul` and `istanbul-lib-source-maps` as dev dependencies and removes
  `v8-to-istanbul`; the coverage-only code in `vite.config.ts` is behind a dynamic import so
  production output and installs are unaffected.
- Any new primary layer must be added to `combineCoverage`'s primary list and the universe guard.
