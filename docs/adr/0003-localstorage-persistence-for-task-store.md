# 0003. Use `localStorage`, single-key JSON array, for task-store persistence

Status: Accepted
Date: 2026-09-19

## Context

The task data model (`.workflow/task-data-model/requirements.md`) is the first piece of state in
this codebase that must survive a page reload. Every existing composable is explicitly documented
as in-memory-only: `useEnergyLevel.ts`'s selected level and toasts reset on reload, and
`useSectionCollapse.ts`'s expand/collapse state is documented (`CLAUDE.md`, ADR 0001) as resetting
to fully expanded on reload. `useAddTaskModal.ts`'s draft fields are similarly session-only,
cleared by `resetFields()` on every open. Nothing in `src/` today reads or writes `localStorage`,
`IndexedDB`, `sessionStorage`, or any other durable store — the e2e suite's per-test
`localStorage.clear()` calls (e.g. `tests/e2e/smoke.spec.ts:5`) exist only as forward-provisioning,
noted explicitly in the task-data-model requirements' Context section.

This is therefore a genuinely new state-management decision — distinct from ADR 0001, which settled
only whether a given piece of state should be a module-level singleton or a per-instance factory,
and said nothing about whether or how state persists across a reload.

Three storage approaches were considered:

1. **No persistence** (in-memory only, matching every other composable today). Simplest, but
   directly contradicts the requirement — a task list that vanishes on reload isn't "a data model
   for tasks" in any useful sense, and requirement 7 explicitly calls for `localStorage`
   persistence with a malformed-data fallback.
2. **IndexedDB.** The browser's other built-in durable-storage option. Better suited to large
   datasets, structured querying, and transactional multi-record updates. But it's asynchronous
   (every read/write returns a `Promise` or requires callback/event handling), which would force
   either an async `useTasks()` API (a first for this codebase's composables, all of which expose
   synchronous refs/functions) or an awkward sync-looking wrapper around async internals. For a
   single JSON-serializable array of plain objects at the scale this app operates at (one person's
   task list, not a multi-table dataset), IndexedDB's extra complexity buys nothing concrete today.
3. **`localStorage`, one namespaced key holding the entire task list as a JSON string.** Synchronous,
   already the storage mechanism every e2e spec assumes will eventually exist (per the Context
   above), and simple enough to hydrate once at module load and re-serialize the whole array on
   every mutation.

## Decision

Persist the task store to `localStorage` under a single dedicated key,
`TASKS_STORAGE_KEY = 'untangle:tasks'` (option 3), storing the entire `Task[]` array as one JSON
string, rewritten in full on every mutation (`addTask`/`updateTask`/`removeTask`/`toggleTaskDone`/
`toggleSubTaskDone`). On module load, `useTasks.ts` reads and `JSON.parse`s that key; a missing key,
non-array JSON, or a `JSON.parse` throw all fall back to an empty in-memory list rather than
crashing (Requirement 7) — this also covers the case where `localStorage` itself is unavailable
(e.g. this codebase's Cucumber/BDD layer runs under plain Node with no global `localStorage`), via
a `typeof localStorage !== 'undefined'` guard around every read/write.

Two things are explicitly **not** part of this decision, because they're already reasoned about
elsewhere and don't need re-litigating here:

- **No schema versioning/migration.** The task-data-model requirements' "Out of scope" section
  already states there is no prior schema to migrate from, so a version field or migration path is
  unnecessary scope for this first version of the store. If the `Task` shape changes in a
  backward-incompatible way in the future, that's the point to introduce a version marker inside
  the stored JSON and a migration step in `loadInitialTasks()` — not before.
- **No cross-tab sync.** The requirements' "Out of scope" section also excludes listening for the
  browser's `storage` event to react to another tab's writes. `localStorage` persistence within a
  single tab/session is sufficient for the stated requirement; two tabs open on the same origin can
  observably diverge until one reloads. This is a known, accepted limitation, not an oversight.

## Consequences

- The task store's read/write shape is synchronous and simple to reason about, consistent with
  every other composable's synchronous API — no new async surface is introduced into `useTasks()`.
- Every mutation rewrites the _entire_ array to `localStorage`, which is `O(n)` in the number of
  tasks per mutation. Fine at this app's expected scale (a personal task list); would need
  revisiting (e.g. a real database, or IndexedDB with per-record writes) if the app ever needed to
  handle a very large number of tasks or high-frequency mutation rates.
- Because there's no schema versioning (by explicit decision above), any future breaking change to
  the `Task` shape needs its own follow-up decision (a new ADR or an amendment to this one) before
  shipping — this ADR does not pre-authorize an ad hoc migration.
- Because there's no cross-tab sync (by explicit decision above), a future requirement asking for
  multi-tab consistency would need a new decision (e.g. adopting a `storage` event listener, or
  moving to a mechanism with built-in multi-context consistency like IndexedDB with a
  `BroadcastChannel`) — this ADR's scope stops at single-tab persistence.
- Unit tests (`tests/unit/tasks/composable.test.ts`) can seed/inspect `localStorage[TASKS_STORAGE_KEY]`
  directly (jsdom provides a real `localStorage`), and e2e tests (`tests/e2e/task-persistence.spec.ts`)
  can do the same in a real browser — no test double or mock storage layer is needed for either
  layer.
- If a future requirement needs querying/filtering at a scale or complexity `localStorage`'s
  read-everything/write-everything model can't reasonably support, this decision should be
  revisited — that would be the point to evaluate IndexedDB (option 2) on its actual merits rather
  than deferring it preemptively here.
