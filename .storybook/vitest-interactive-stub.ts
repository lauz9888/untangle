// Aliased in place of the bare `'vitest'` specifier, but ONLY for the
// interactive `npm run storybook` / `npm run build-storybook` Vite pipeline
// (wired via `.storybook/main.ts`'s `viteFinal`'s `resolve.alias`, itself
// gated on `process.env.VITEST !== 'true'` — see the long comment there for
// why: `@storybook/addon-vitest`'s vitest-plugin merges this entire
// `viteFinal` result into the REAL `test:storybook` Vitest config too, so
// this alias must be skipped there, not just left in place, or it silently
// hangs `test:storybook` by replacing the real `vitest` package Vitest's own
// runtime needs).
//
// Root cause this works around: every `.stories.ts` file imports `vi`/
// `expect` from `'vitest'` (per design.md §6's canonical template) so the
// same source works under both npm run storybook AND npm run test:storybook.
// Under real Vitest (`test:storybook`) that's fine — Vitest's own runtime
// initializes the global Jest-matchers state `@vitest/expect` needs before
// any test file's top-level `chai.use(...)` call runs. Under the *plain*
// interactive dev server there is no such runtime: Storybook's Vite builder
// still has to resolve and evaluate the real `vitest` package's own bundled
// `expect` integration (a top-level `chai.use(JestChaiExpect)` call) the
// moment any `.stories.ts` file imports anything from `'vitest'`, and that
// integration reads `globalThis[JEST_MATCHERS_OBJECT].customEqualityTesters`
// before the matching initialization guard in the same bundle has run —
// throwing `Cannot read properties of undefined (reading
// 'customEqualityTesters')` for every single story, confirmed by reproducing
// it directly (`AddTaskButton/Default`, `EnergySelector/Unselected`) and by
// tracing it into `@vitest/expect`'s bundled `JestChaiExpect`/
// `getCustomEqualityTesters`.
//
// `vi.fn`/`expect` below delegate to `storybook/test`'s own portable
// implementations (used everywhere else in `.stories.ts` files already,
// e.g. for `within`/`userEvent`), which are explicitly designed to work
// standalone in a browser with no live Vitest process. `vi.mock` becomes a
// no-op here: per design.md §12 Risk #1, `vi.mock`'s hoisted module-mocking
// only ever worked under the real Vitest transform pipeline in the first
// place (`npm run storybook` was already documented to render every story
// against its real singleton composable, not the mocked one) — so a no-op
// changes nothing observable, it just stops the crash. `npm run
// test:storybook` never resolves through this stub (see the gating comment
// above), so `vi.mock` there still hoists and applies for real.
import {
  expect,
  fn,
  spyOn,
  mocked,
  clearAllMocks,
  resetAllMocks,
  restoreAllMocks,
} from 'storybook/test'

export const vi = {
  fn,
  spyOn,
  mocked,
  clearAllMocks,
  resetAllMocks,
  restoreAllMocks,
  mock: () => {},
}

export { expect }
