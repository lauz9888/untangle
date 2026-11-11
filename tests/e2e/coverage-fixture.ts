import { test as base, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { addCounters, type CoverageMapLike, type PrevCounters } from './coverage-counters'

const NYC_OUTPUT_DIR = path.resolve(process.cwd(), '.nyc_output')

// Custom `test` that, only when COVERAGE=true (set by scripts/merge-coverage.mjs
// for the e2e phase of `test:coverage:merge`), collects Istanbul coverage for
// each test. The app is built with `vite-plugin-istanbul` under COVERAGE=true
// (vite.config.ts), so each document exposes `window.__coverage__`. That object
// is per-document and tests reload, so an init script synchronously flushes
// the counters into sessionStorage (`__cov_prev`) on pagehide; at test end we
// read the last document's counters plus the flushed ones, add them in Node
// (`addCounters`), and write `.nyc_output/<uuid>.json`, which
// `tests/e2e/global-teardown.ts` merges and remaps to original-source
// coordinates into `coverage/e2e/coverage-final.json`.
export const test = base.extend({
  page: async ({ page }, use) => {
    const collectCoverage = process.env.COVERAGE === 'true'

    if (collectCoverage) {
      await page.addInitScript(() => {
        const KEY = '__cov_prev'
        let flushed = false
        const flush = () => {
          if (flushed) return
          flushed = true
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cov = (window as any).__coverage__
          if (!cov) return
          try {
            const prev = JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
            for (const [file, c] of Object.entries<{ s: object; f: object; b: object }>(cov)) {
              const p = (prev[file] ??= { s: {}, f: {}, b: {} })
              for (const [id, n] of Object.entries(c.s) as [string, number][]) {
                p.s[id] = (p.s[id] ?? 0) + n
              }
              for (const [id, n] of Object.entries(c.f) as [string, number][]) {
                p.f[id] = (p.f[id] ?? 0) + n
              }
              for (const [id, arms] of Object.entries(c.b) as [string, number[]][]) {
                const t = (p.b[id] ??= arms.map(() => 0))
                arms.forEach((n, i) => {
                  t[i] = (t[i] ?? 0) + n
                })
              }
            }
            sessionStorage.setItem(KEY, JSON.stringify(prev))
          } catch {
            // storage unavailable: under-count only
          }
        }
        window.addEventListener('pagehide', flush)
        window.addEventListener('beforeunload', flush)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') flush()
        })
      })
    }

    await use(page)

    if (collectCoverage) {
      const snapshot = await page.evaluate(() => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        current: ((window as any).__coverage__ ?? null) as CoverageMapLike | null,
        prev: JSON.parse(sessionStorage.getItem('__cov_prev') ?? 'null') as PrevCounters | null,
      }))
      if (snapshot.current) {
        const merged = addCounters(snapshot.current, snapshot.prev)
        fs.mkdirSync(NYC_OUTPUT_DIR, { recursive: true })
        fs.writeFileSync(
          path.join(NYC_OUTPUT_DIR, `${crypto.randomUUID()}.json`),
          JSON.stringify(merged)
        )
      }
    }
  },
})

export { expect }
