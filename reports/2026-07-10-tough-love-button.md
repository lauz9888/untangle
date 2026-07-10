# Add Tough love button

**Branch:** `feature/tough-love-button` · **PR:** [#95](https://github.com/lauz9888/untangle/pull/95) · **Merged:** 2026-07-10

## Requirement

Add a "Tough love" button next to the existing "Encourage me" button in the header actions.

- Clicking it shows a toast (reusing the existing `ToastNotification` mechanism) with the same auto-dismiss (4.5s) / manual-close behavior as Encourage me.
- The message is chosen at random from a new `TOUGH_LOVE_MESSAGES` pool (50 entries) — firm, no-nonsense, get-moving tone, not harsh, insulting, or shaming.
- Works independently of energy-level selection and of Encourage me: no energy level needs to be selected, and clicking it doesn't change the current selection.
- Visual styling matches Encourage me — no distinct accent color.

## Solution

Extended the existing `useEnergyLevel.js` singleton rather than introducing a parallel mechanism, mirroring exactly how `encourageMe()` was added: `TOUGH_LOVE_MESSAGES` (50 messages) plus a `toughLove()` function that picks one at random via the existing `randomFrom()` helper and bumps `toastId`, without touching `selectedLevel`.

New thin component `ToughLoveButton.vue` mirrors `EncourageButton.vue`'s markup, styling, and `<=640px` mobile tap-target pattern exactly, calling `toughLove()`. `App.vue` renders it immediately after `EncourageButton` in `.header-actions`. `ToastNotification.vue` needed no changes, since it already reacts generically to `toastMessage`/`toastId`.

Test coverage mirrors the Encourage me pair: a `describe('toughLove')` block added to `composable.test.js`, `ToughLoveButton` cases added to `components.test.js`, and a new `tests/e2e/tough-love.spec.js` mirroring `encourage-me.spec.js`'s flows (toast on click, energy-level interplay, dismiss/auto-dismiss, repeat clicks). The mobile tap-target e2e test was extended to also check the new button. 100% unit test coverage maintained.

No new dependencies.

## Bugs raised and resolved

| # | Category | Detected by | Summary | Resolution |
| --- | --- | --- | --- | --- |
| [#96](https://github.com/lauz9888/untangle/issues/96) | `ci-lint` | `deploy-branch` | The `CLAUDE.md` table row documenting the new key file wasn't Prettier-formatted, failing the Lint job's `format:check` step | Ran `prettier --write CLAUDE.md`, committed the fix, and re-pushed; all 9 CI jobs passed on the next run |

## Time taken

Wall-clock time from requirement analysis to merge: **~20 minutes** (18:21:11 → 18:40:49 UTC).

This spans human wait time as well as engineering time — it is not a measure of pure implementation effort. Roughly:

- **Human response time** (~3 min): requirement clarification (visual style / pool size), requirement approval, and manual-testing/merge confirmations.
- **CI wait time** (~2 min): two CI runs against GitHub Actions' 9 required jobs — the first caught the CLAUDE.md formatting issue, the second was green.
- **Active engineering time** (~15 min): design, TDD unit tests, implementation, refactor, TDD e2e tests, real e2e execution, the CI loop-back and its fix, and the wiki update.
