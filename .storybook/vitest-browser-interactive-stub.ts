// Aliased in place of the `'vitest/browser'` specifier, but ONLY for the
// interactive `npm run storybook` / `npm run build-storybook` Vite pipeline
// (wired via `.storybook/main.ts`'s `viteFinal`'s `resolve.alias`, same
// mechanism/scoping as `./vitest-interactive-stub.ts` — see that file for
// why this never reaches `npm run test:storybook`).
//
// Root cause this works around: `CollapsibleSection.stories.ts` and
// `NowNextLaterBoard.stories.ts` both import `page` from `'vitest/browser'`
// to resize the viewport before their mobile-only interaction (per
// CLAUDE.md's <=640px collapse-toggle breakpoint). The real
// `vitest/browser` package (`node_modules/vitest/browser/context.js`) is
// deliberately a "fake exports for static analysis" stub that unconditionally
// throws `vitest/browser can be imported only inside the Browser Mode` the
// moment it's evaluated outside Vitest's real browser-mode dev server (which
// intercepts this specifier and serves a live implementation instead — that
// interception only happens under `test:storybook`'s real Vitest process).
// Under the plain interactive dev server that throw happens at module
// top-level, which breaks the *entire* `.stories.ts` module — every story
// exported from the same file, not just the one using `page.viewport(...)`
// (confirmed by reproducing it: both `CollapsibleSection.stories.ts`'s and
// `NowNextLaterBoard.stories.ts`'s stories all failed to load with
// "Failed to fetch dynamically imported module").
//
// `page.viewport(...)` becomes a no-op here — same "cosmetic interactively,
// unaffected for real under test:storybook" acceptance already documented
// for `vi.mock` in design.md §12 Risk #1: the mobile-only toggle button
// this feeds into just won't be visible at the dev server's default desktop
// viewport, so the `Interactions` story's play function will visibly show a
// failed "element not found" interaction in Storybook's own panel when
// browsed interactively (same category as the already-accepted `vi.mock`
// mismatch), rather than crashing the whole story file.
export const page = {
  viewport: async () => {},
}
export const server = undefined
export const userEvent = undefined
export const cdp = undefined
export const commands = undefined
export const locators = undefined
export const utils = undefined
