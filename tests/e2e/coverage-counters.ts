// Pure helper for tests/e2e/coverage-fixture.ts: adds the counters flushed from
// earlier documents (kept in sessionStorage across reloads) into the current
// document's `window.__coverage__`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FileCov = Record<string, any>
export type CoverageMapLike = Record<string, FileCov>
export type PrevCounters = Record<
  string,
  { s?: Record<string, number>; f?: Record<string, number>; b?: Record<string, number[]> }
>

export function addCounters(current: CoverageMapLike, prev: PrevCounters | null): CoverageMapLike {
  const out = structuredClone(current)
  if (!prev) return out
  for (const [file, counters] of Object.entries(prev)) {
    const target = out[file]
    if (!target) continue
    for (const [id, n] of Object.entries(counters.s ?? {})) {
      if (id in target.s) target.s[id] += n
    }
    for (const [id, n] of Object.entries(counters.f ?? {})) {
      if (id in target.f) target.f[id] += n
    }
    for (const [id, arms] of Object.entries(counters.b ?? {})) {
      const t = target.b[id]
      if (!t) continue
      arms.forEach((n, i) => {
        if (i < t.length) t[i] += n
      })
    }
  }
  return out
}
