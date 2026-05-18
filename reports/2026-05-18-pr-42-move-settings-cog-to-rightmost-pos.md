# Change report: Move settings cog to rightmost position in desktop header

**PR**: [#42](https://github.com/lauz9888/untangle/pull/42) · **Merged**: 2026-05-18 · **Commit**: [`518d4bb`](https://github.com/lauz9888/untangle/commit/518d4bb078ac33c5be01f13a95577bc5efc59c9a)

## What changed

`src/App.vue` was restructured so the settings button sits as the last direct child of `.app-controls` rather than inside `.controls-meta`, making it naturally rightmost in the desktop flex row. On mobile the layout is preserved using CSS `order` (controls-meta: 1, settings-btn: 2, controls-actions: 3) combined with `width: 100%` on `.controls-actions` to force it onto a second row. `vite.config.js` gained worktree auto-detection (`.git` file vs directory) to default the dev server to port 5174 in worktrees, and `playwright.config.js` now sets `reuseExistingServer: !process.env.CI` so the test suite can run alongside an active dev server locally.

## Why

The settings cog is a secondary action and was visually grouped with primary controls (Encourage Me, Tough Love). Moving it to the far right gives it a clear separation and matches the conventional placement of configuration controls in application headers.

## Bug analysis

No bugs were formally raised during this change. One layout regression was caught during manual testing before merge: the initial CSS approach placed the settings button on a third row in mobile view rather than alongside the streak and history controls. This was identified immediately on first visual inspection and fixed in the same session. The automated e2e suite did not catch this because the new layout test only asserts desktop x-position; mobile layout is not yet covered by automated assertions. The clean bug count reflects a low-complexity change, though the mobile regression highlights a gap in visual test coverage for the mobile header.
