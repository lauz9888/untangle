# Add Untangle logo and tagline to the homepage

**Branch:** `feat/home-logo-tagline` · **PR:** [#78](https://github.com/lauz9888/untangle/pull/78) · **Merged:** 2026-07-03

## Requirement

Replace the current placeholder homepage (`App.vue`) with a blank landing page. Top-left corner shows the Untangle logo: a small abstract icon (untangling line/knot motif) plus the "Untangle" wordmark. The tagline "Space to think" appears directly beneath the logo in smaller, lighter text. The rest of the page is fully blank — no nav, no body copy, no other UI elements.

Two design decisions were confirmed with the user up front: logo style (icon + wordmark, over wordmark-only or icon-only) and tagline placement (directly under the logo, over centered-on-page).

## Solution

Single-file change to `src/App.vue` — no new composable or component, since there's no business logic to extract (a static brand header doesn't warrant one). The template is a `<main>` landmark wrapping a `<header class="brand">` containing a decorative inline SVG icon (`aria-hidden`), the `<h1>Untangle</h1>` wordmark, and a `<p class="tagline">Space to think</p>`. Layout is positioned top-left via absolute positioning rather than the previous centered/max-width container. No new dependencies.

Existing `tests/unit/smoke.test.js` and `tests/e2e/smoke.spec.js` were extended (not replaced) to cover the tagline, the decorative icon, and the absence of any other body content, while keeping their original heading assertion intact.

## Bugs raised and resolved

| # | Category | Detected by | Summary | Resolution |
|---|----------|-------------|---------|------------|
| [#77](https://github.com/lauz9888/untangle/issues/77) | `e2e` | `e2e-test-execution` | Homepage rooted content in a `<header>` with no `<main>` landmark — axe-core flagged `landmark-one-main` (moderate) | Wrapped the brand header in `<main>` |
| [#79](https://github.com/lauz9888/untangle/issues/79) | `ci-docs` | `deploy-branch` CI | `src/App.vue` changed without `CLAUDE.md`/`README.md` also changing, tripping the CI documentation-check job | Added a one-line note to `README.md` describing the new homepage |

Both were found by the pipeline's own later stages exactly as designed (e2e execution catching an a11y regression the unit-level tests couldn't see; CI catching a missed docs update) and fixed via the `resume_after_fix` loop-back to `solution-implementation` without redoing earlier stages.

## Time taken

Wall-clock time from requirement analysis to merge: **~20 minutes** (17:58:25 → 18:18:18 UTC).

This spans human wait time as well as engineering time — it is not a measure of pure implementation effort. Roughly:

- **Human response time** (~7–8 min): two logo/tagline clarifying questions, requirement approval, manual-testing review (which included one round-trip after the local dev server had stopped and needed restarting), and the final merge confirmation.
- **CI wait time** (~2 min): two full CI runs (~55–65s each) against GitHub Actions' 9 required jobs.
- **Active engineering time** (~10 min): design, test-writing, implementation, the two bug-fix loops, and the wiki update — this is the part that scales with change complexity; the human/CI waits above are largely fixed overhead per change.
