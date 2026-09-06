```metrics
tracking_issue: 99
started_at: 2026-09-06T16:35:28Z
completed_at: 2026-09-06T17:58:48Z
total_hours: 1.39
coverage_percent: 100.00
outcome: deployed
bugs_by_stage:
  requirement: 0
  design: 9
  unit-test: 0
  bdd-test: 0
  e2e-test: 0
  qa: 0
  deploy-path: 0
  manual-test: 0
  ci: 1
  cd: 0
bugs_by_category:
  security: 0
  accessibility: 1
```

# Now / Next / Later sections

**Branch:** `feature/now-next-later` · **PR:** [#109](https://github.com/lauz9888/untangle/pull/109) (squash-merged) · **Tracking issue:** [#99](https://github.com/lauz9888/untangle/issues/99) · **Deployed:** 2026-09-06

## Requirements

Add a fixed, three-section layout — "Now", "Next", "Later" — below the existing header:

- Desktop (>640px): the three sections render as columns, side by side, always fully expanded, with no collapse control present or operable.
- Mobile (≤640px): the three sections render stacked as rows, each with its own independent collapse/expand control (accordion-per-section, not mutually exclusive).
- Collapse/expand state is in-memory only, defaults to fully expanded on every load, and survives a resize across the 640px breakpoint without being reset.
- Section labels/order ("Now", "Next", "Later") are fixed and hardcoded — no user-facing rename/reorder/add/remove.
- Sections carry no task content in this change — a layout scaffold only. Confirmed explicitly out of scope: the task data model itself, task-to-section assignment, drag-and-drop, energy-level filtering, and persisted collapse state — all deferred to future work, since the codebase currently has no task list/model at all (`useTasks` doesn't exist yet; `CLAUDE.md`'s description of it is aspirational).
- Eight accessibility requirements (WCAG 2.1 AA baseline): real `<button>` toggle with an accessible name including the section label, synced `aria-expanded`, `aria-controls` linking control to content, full keyboard operability, a visible focus indicator, true removal of collapsed content from the accessibility tree (not just visual hiding), AA contrast, and correct semantic landmark/heading grouping per section.

Approved 2026-09-06 (full text: `.workflow/now-next-later/requirements.md`).

## Solution

A layout scaffold: one new composable, two new components, a small `App.vue` template change. No task data model, no persistence, no changes to `useEnergyLevel.ts` or its components.

- **`src/composables/useSectionCollapse.ts`** (new) — a plain, non-singleton composable factory (not a module-level singleton like `useEnergyLevel.ts`), returning a `reactive` per-section `expanded` map (`now`/`next`/`later`, defaulting to all-`true`) and a `toggle(key)` function. `SECTION_DEFS` is the single hardcoded source of truth for labels and order. The non-singleton choice is recorded in a new ADR, `docs/adr/0001-non-singleton-composable-for-section-collapse.md`, as a deliberate deviation from the codebase's existing singleton convention.
- **`src/components/CollapsibleSection.vue`** (new) — a `<section aria-labelledby>` with an `<h2>` heading and a toggle `<button>`, content `<div>` carrying the native `hidden` attribute when collapsed.
- **`src/components/NowNextLaterBoard.vue`** (new) — owns the one `useSectionCollapse()` instance, renders the three `CollapsibleSection`s via `v-for` over `SECTION_DEFS`.
- **`src/App.vue`** (changed) — renders `<NowNextLaterBoard />` inside `<main>`, after the header and before the toast.
- **Desktop-forced-expansion is CSS-only, not JS-detected**: rather than tracking viewport width in JavaScript, the collapsed/expanded boolean is purely data; a scoped `@media (max-width: 640px)` rule is the only thing that lets the native `hidden` attribute take visual effect — above that breakpoint, a CSS override neutralizes `hidden`'s default `display: none`, forcing content always visible regardless of the stored state. This keeps the breakpoint-dependent behavior in the same place every other responsive rule in the codebase already lives, with zero new viewport-detection code, and makes cross-breakpoint state persistence automatic (a resize never touches the Vue component tree or the composable's refs).

**Design amendment mid-pipeline**: Step 14 manual testing asked for icon-only toggle buttons instead of visible "Collapse Now"/"Expand Now" text. The button's accessible name moved from text content to an explicit `aria-label` (same computed string, different source); the previously-decorative chevron `<span>` became the button's sole visible content and now rotates as the visual state cue. This triggered a short follow-on design-review sub-loop (see "Bugs raised" below) to catch every test assertion the wording-to-attribute move broke.

No new dependencies. Full design detail: `.workflow/now-next-later/design.md`.

## Test changes

- **`tests/unit/now-next-later/composable.test.ts`** — `useSectionCollapse()` behavior with fresh factory calls per test (no `vi.resetModules()` needed, since it isn't a singleton): default all-expanded state, `toggle` flips only the targeted key, double-toggle returns to original, two independent instances don't share state, and `SECTION_DEFS` content/order. No automated WCAG scan (pure logic, nothing rendered).
- **`tests/unit/now-next-later/components.test.ts`** — mocks `useSectionCollapse` (and `useEnergyLevel`, for the `App`-mounting block) to isolate rendering: `NowNextLaterBoard` renders three sections in order and wires `toggle` calls correctly; `CollapsibleSection` markup (`aria-labelledby`, `aria-expanded`, `aria-controls`, chevron rotation class, `aria-label` wording per state, `hidden` attribute presence); `App` renders the board after the header. **Includes `jest-axe` scans** (WCAG tags per `.claude/STANDARDS.md`, `color-contrast` disabled) of `CollapsibleSection` expanded/collapsed, `NowNextLaterBoard` default and mixed-state, and the fully mounted `App`.
- **`features/now-next-later-sections.feature`** + **`features/step_definitions/section-collapse.steps.ts`** + **`features/support/world.ts`** — BDD scenarios driving the real (non-mocked) composable at a coarser grain: default all-expanded state, independent per-section collapse/expand (scenario outline over all three keys), and toggle-twice returns to original. No automated WCAG scan (Cucumber steps, no rendered browser DOM).
- **`tests/e2e/now-next-later.spec.ts`** — real-browser desktop (columns, no toggle exposed to the accessibility tree) and mobile (rows, visible toggles, 44px tap targets, independent collapse, keyboard `Enter`/`Space` activation, visible focus-indicator `getComputedStyle` check, chevron rotation, reload-resets-state) checks, plus the one behavior only verifiable here — collapse state surviving a resize across the 640px breakpoint. No axe scan in this file itself (layout/interaction assertions).
- **`tests/e2e/helpers.ts`** — extended with `sectionToggle(page, label)` and `sectionContent(page, key)` helpers used by the spec above.
- **`tests/e2e/a11y.spec.ts`** — extended with two new `@axe-core/playwright` scans (default desktop viewport with sections present; mobile viewport with one section collapsed), the layer that actually exercises real contrast computation against the new border/button colors, since jsdom's `color-contrast` rule is disabled at the unit layer.

Per `state.md`, all three layers' scoped (Steps 5-7) and full (Steps 9-11) suites passed green on the first attempt — no unit/BDD/e2e bug-fix loop was needed. Combined coverage: **100.00%**.

## Accessibility

Requirement-by-requirement coverage (from `design.md`'s coverage map):

- **Req 9 (accessible name incl. label)**: real `<button type="button">`; after the icon-only amendment, name comes from `:aria-label="expanded ? 'Collapse '+label : 'Expand '+label'"` rather than visible text — same computed value, verified by unit + e2e assertions.
- **Req 10 (`aria-expanded` synced)**: bound directly to the reactive `expanded` boolean, no derived copy; documented (with an inline CSS comment) that it's only meaningfully observable ≤640px, since the same rule that forces desktop layout also removes the button from the accessibility tree there.
- **Req 11 (`aria-controls`)**: button's `aria-controls` references the content `<div>`'s `id`, both computed from the same section key.
- **Req 12 (keyboard operable)**: native `<button>`, no custom key handling — `Enter`/`Space` verified in real Chromium via e2e.
- **Req 13 (visible focus indicator)**: no `outline` override anywhere in the new files, so the browser's native `:focus-visible` ring applies; verified concretely via an e2e `getComputedStyle` check (`outlineStyle`/`outlineWidth`) — this exact gap was caught as issue #104 (see below) since the original design left it untested at any layer.
- **Req 14 (removed from a11y tree when collapsed)**: native `hidden` attribute (not visual-only hiding), effective ≤640px.
- **Req 15 (AA contrast)**: reuses the app's existing, already-audited palette (`#1a1a1a` on `#fff`, `#d6d6d6` borders) — no new colors; verified for real via the two new `a11y.spec.ts` `@axe-core/playwright` scans.
- **Req 16 (semantic grouping)**: each section is a `<section aria-labelledby>` wrapping an `<h2>`, exposed as three distinctly-named `region` landmarks.

Issues carrying the `accessibility` label:

- **[#104](https://github.com/lauz9888/untangle/issues/104)** (`design`, `accessibility`) — Requirement 13 (visible focus indicator) had no test assigned at any layer in the original design. **Resolution**: design amended to add a concrete e2e `getComputedStyle` outline check to `tests/e2e/now-next-later.spec.ts`'s mobile-viewport block; closed 2026-09-06.

## Bugs raised

All 10 bug issues opened during this run were closed before merge; none reached CI or post-merge.

**`design`** (9 issues — all caught during the solution-design review loop before implementation began):

| # | Opened → Closed (UTC) | Summary | Resolution |
|---|---|---|---|
| [#100](https://github.com/lauz9888/untangle/issues/100) | 16:53 → 17:05 | `aria-expanded` desktop-sync dependency on the toggle's `display: none` rule was undocumented | Added explicit note + inline CSS comment in design |
| [#101](https://github.com/lauz9888/untangle/issues/101) | 16:53 → 17:05 | Unit-layer jest-axe scan scope for the `hidden`/CSS-override technique was left unresolved | Design now states explicitly what unit-level axe scans do/don't verify (markup pattern only; desktop override is e2e-only) |
| [#102](https://github.com/lauz9888/untangle/issues/102) | 16:53 → 17:05 | Proposed `App`-mounting unit test mounted the real `useEnergyLevel` singleton instead of mocking it, risking cross-file state bleed | Design updated to mock `useEnergyLevel` in that test file, per existing convention |
| [#103](https://github.com/lauz9888/untangle/issues/103) | 16:59 → 17:05 | `vi.mock` for `useSectionCollapse` was drafted as if it could apply to some `describe` blocks but not others in the same file — not achievable (`vi.mock` is file-scoped/hoisted) | Design revised to mock uniformly across the whole test file |
| [#104](https://github.com/lauz9888/untangle/issues/104) | 16:59 → 17:05 | Requirement 13 (visible focus indicator) had no assigned test at any layer | Added e2e `getComputedStyle` outline assertion (see "Accessibility" above) |
| [#105](https://github.com/lauz9888/untangle/issues/105) | 17:26 → 17:39 | Step 14 manual-test feedback: toggle buttons should be icon-only, not text labels | Design amended: accessible name moved to `aria-label`, chevron repurposed as sole visible content and rotation cue |
| [#106](https://github.com/lauz9888/untangle/issues/106) | 17:32 → 17:39 | The icon-only amendment didn't account for existing e2e `toContainText('Collapse Now')`-style assertions it would break | Design specifies exact lines rewritten to `toHaveAttribute('aria-label', ...)` |
| [#107](https://github.com/lauz9888/untangle/issues/107) | 17:32 → 17:39 | Design's e2e "empty `innerText`" assertion was wrong — `aria-hidden` doesn't remove the chevron glyph from `innerText`/`textContent` | Corrected to assert the visible text is the chevron glyph only (or excludes "Collapse"/"Expand") |
| [#108](https://github.com/lauz9888/untangle/issues/108) | 17:36 → 17:39 | Same class of gap as #106, for the unit-layer tests (lines 126-134 asserting button text) | Design specifies rewriting/renaming those two unit tests to assert `aria-label` instead |

**`ci`** (1 issue — pre-merge, PR #109):

| # | Opened → Closed (UTC) | Summary | Resolution |
|---|---|---|---|
| [#110](https://github.com/lauz9888/untangle/issues/110) | 17:49 → 17:53 | Dependency audit job failed: `nanoid` <3.3.18 high-severity advisory (GHSA-2v37-7h3g-55p8), pre-existing in `main`, first surfaced by this PR's CI run — no `package.json`/`package-lock.json` changes on this branch caused it | `npm audit fix`, re-pushed, all 9 CI jobs green |

No `requirement`, `unit-test`, `bdd-test`, `e2e-test`, `qa`, `deploy-path`, `manual-test`, or `cd`-labeled issues were raised this run. All unit/BDD/e2e suites (Steps 5-11) passed green on the first attempt; the base-path smoke check (Step 13, `GITHUB_PAGES=true`) passed cleanly on the first attempt; CD (build, deploy, PWA validation, live e2e, post-deploy smoke check) was all green on the first attempt.

## Coverage

Combined statement coverage across unit + BDD + e2e: **100.00%** (`state.md`'s `coverage-percent`), well above the `.claude/STANDARDS.md` threshold.

## Outcome

**Deployed.** Merge SHA `729ecebfe3ffb9bcd81460773aff09f16b37eb56` built and published successfully to GitHub Pages (CD run [34050026820](https://github.com/lauz9888/untangle/actions/runs/34050026820)); post-deploy smoke check, PWA validation, and live e2e all passed. This change is live.

## Time taken

Wall-clock time from requirements analysis start to CD completion: **~1 hour 23 minutes** (2026-09-06T16:35:28Z → 2026-09-06T17:58:48Z, ~1.39 hours).

This spans human wait time as well as engineering time — it includes the two human gates (requirements approval at Step 2 and the manual-test sign-off at Step 14, which itself triggered the icon-only-button design amendment and its 3-issue review sub-loop) alongside CI/CD wait time, not just active engineering/implementation effort. Given the compressed nature of this run (no unit/BDD/e2e failures to loop on, CI green on the second push, CD green on the first), most of the elapsed time reflects the four design-review cycles (issues #100-108) and their fix turnaround plus the two human-gate pauses, rather than raw coding time.
