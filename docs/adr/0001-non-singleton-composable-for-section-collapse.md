# 0001. Use a per-instance (non-singleton) composable for Now/Next/Later collapse state

Status: Accepted
Date: 2026-09-06

## Context

The Now/Next/Later scaffold (see `.workflow/now-next-later/requirements.md`) needs in-memory
expand/collapse state for three fixed sections, scoped to a single parent component
(`NowNextLaterBoard.vue`) and its three `CollapsibleSection.vue` children.

The codebase's one existing precedent for cross-component state, `src/composables/useEnergyLevel.ts`,
is a module-level singleton: refs are declared outside the exported function, so every caller
shares one instance. That pattern exists because energy-level/toast state is read and written by
four components (`EnergySelector`, `EncourageButton`, `ToughLoveButton`, `ToastNotification`) that
are siblings in `App.vue`'s tree with no parent-child relationship to each other — a singleton is
the simplest way to share that state without prop-drilling through `App.vue`.

Section-collapse state has a different shape: exactly one consumer subtree
(`NowNextLaterBoard.vue` owns the state; its three `CollapsibleSection.vue` children receive it via
props and report interactions via an emitted event). No other component in the app needs to read or
write it. Two options were considered:

1. Follow the `useEnergyLevel` precedent literally: a module-level singleton
   `useSectionCollapse()`.
2. A plain (non-singleton) composable factory: each call returns a fresh set of reactive refs,
   scoped to whichever component called it.

## Decision

Implement `useSectionCollapse()` as a plain factory function (option 2), called once inside
`NowNextLaterBoard.vue`'s `<script setup>`. It is a composable — business logic still lives outside
the component, per this codebase's "components stay thin" convention — but it is deliberately _not_
a module-level singleton.

## Consequences

- Matches the actual data-sharing shape needed (single owning subtree) without introducing global
  state that nothing outside that subtree reads.
- Each call to `useSectionCollapse()` (including from multiple mounts in tests) gets independent
  state. This removes the need for the `vi.resetModules()` dance that `useEnergyLevel`'s tests
  require to get a clean singleton between test cases (see
  `tests/unit/energy-level/composable.test.ts`); `tests/unit/now-next-later/composable.test.ts` can
  call the factory fresh per test instead.
- Cucumber's default World instantiation (one new World per scenario) gives BDD scenarios a fresh
  `useSectionCollapse()` instance for free, with no explicit "reset" step needed (unlike the energy
  World's `Given a fresh session` step, which must manually undo singleton state).
- If a future requirement needs section-collapse state to be read or controlled from outside the
  `NowNextLaterBoard` subtree (e.g. a global "collapse all" control living elsewhere in the header),
  this decision should be revisited — that would be the point to promote `useSectionCollapse` to a
  module-level singleton, matching `useEnergyLevel`'s pattern.
