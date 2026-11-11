import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as lib from '../../../scripts/lib/coverage-merge.mjs'
import { A_SRC, CAL_SRC, goodLayers, layer, type Layer } from './fixtures'

// The five investigation signals (#215, REQ-011, REQ-013): fire on the pattern, absent
// otherwise, never throw. Each line is `Coverage signal: <pattern> layer=<l> file=<f> <detail>`.

const A = '/proj/src/a.ts'
const CAL = '/proj/src/cal.ts'
const sources: Record<string, string> = { [A]: A_SRC, [CAL]: CAL_SRC }

// collectSignals' `enumerate` stub: reports the number of functions / branch constructs
// a source file has. The Istanbul-shaped fields are present too so either contract works.
function enumerateWith(counts: Record<string, { fns: number; brs: number }>) {
  return (file: string) => {
    const c = counts[file] ?? { fns: 0, brs: 0 }
    return {
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      f: {},
      b: {},
      functions: c.fns,
      branches: c.brs,
    }
  }
}
const healthyCounts = { [A]: { fns: 1, brs: 1 }, [CAL]: { fns: 1, brs: 0 } }

type Over = {
  layers?: Record<string, Layer>
  inventory?: Layer
  baseline?: { statements: number; branches: number; method: string } | null
  counts?: Record<string, { fns: number; brs: number }>
}

function signals(over: Over = {}): string[] {
  const layers = over.layers ?? goodLayers(A, CAL)
  const inventory =
    over.inventory ??
    lib.combineCoverage({
      primary: [layers.unit as Layer, layers.storybook as Layer],
      secondary: [layers.bdd as Layer, layers.e2e as Layer],
    }).data
  return lib.collectSignals({
    layers,
    inventory,
    readSource: (f: string) => sources[f] ?? '',
    baseline: over.baseline ?? null,
    enumerate: enumerateWith(over.counts ?? healthyCounts),
  })
}
const of = (lines: string[], pattern: string) =>
  lines.filter((l) => l.startsWith(`Coverage signal: ${pattern}`))

const stmtLayer = (hits: number[], file = A) =>
  layer({ [file]: { statements: hits.map((h, i) => ({ line: i + 1, hits: h })) } })

describe('collectSignals: baseline behaviour', () => {
  it('a healthy set of layers emits no signal at all', () => {
    expect(signals()).toEqual([])
  })

  it('never throws on layers whose files lack the optional maps', () => {
    const bare = { [A]: { path: A } }
    expect(() =>
      signals({ layers: { unit: bare, storybook: bare, bdd: bare, e2e: bare } })
    ).not.toThrow()
    expect(() => signals({ layers: { unit: {}, storybook: {}, bdd: {}, e2e: {} } })).not.toThrow()
  })
})

describe('signal: uniform-hit-counts', () => {
  const withBdd = (hits: number[]) => ({ ...goodLayers(A, CAL), bdd: stmtLayer(hits) })

  it('fires for a file with 5 statements that share one hit count, naming pattern, layer and file', () => {
    const out = of(signals({ layers: withBdd([2, 2, 2, 2, 2]) }), 'uniform-hit-counts')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/layer=bdd/)
    expect(out[0]).toMatch(/file=\S*src\/a\.ts/)
  })

  it.each([1, 4])('does not fire for a uniform file with %i statements', (n) => {
    const hits = Array.from({ length: n }, () => 3)
    expect(of(signals({ layers: withBdd(hits) }), 'uniform-hit-counts')).toEqual([])
  })

  it('does not fire for a 5-statement file with differing hit counts', () => {
    expect(of(signals({ layers: withBdd([2, 2, 2, 2, 1]) }), 'uniform-hit-counts')).toEqual([])
  })
})

describe('signal: no-zero-hit-statements', () => {
  it('fires for a layer whose statements all have hits (but are not all one value)', () => {
    const layers = { ...goodLayers(A, CAL), e2e: stmtLayer([1, 2, 3, 1, 2, 4]) }
    const out = of(signals({ layers }), 'no-zero-hit-statements')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/layer=e2e/)
  })

  it('is absent when the layer has a zero-hit statement', () => {
    const layers = { ...goodLayers(A, CAL), e2e: stmtLayer([1, 2, 0, 1, 2, 4]) }
    expect(of(signals({ layers }), 'no-zero-hit-statements')).toEqual([])
  })

  it('is absent for a fully flat layer (that case blocks instead)', () => {
    const layers = { ...goodLayers(A, CAL), e2e: stmtLayer([1, 1, 1, 1, 1, 1]) }
    expect(of(signals({ layers }), 'no-zero-hit-statements')).toEqual([])
  })
})

describe('signals: empty-fn-map / empty-branch-map', () => {
  const emptied = (key: 'fnMap' | 'branchMap') => {
    const layers = goodLayers(A, CAL)
    const fc = structuredClone(layers.bdd[A])
    fc[key] = {}
    if (key === 'fnMap') fc.f = {}
    else fc.b = {}
    layers.bdd = { ...layers.bdd, [A]: fc }
    return layers
  }

  it('empty-fn-map fires when a layer file has no functions but the source has some', () => {
    const out = of(signals({ layers: emptied('fnMap') }), 'empty-fn-map')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/layer=bdd/)
    expect(out[0]).toMatch(/file=\S*src\/a\.ts/)
  })

  it('empty-fn-map is absent when the source has no functions', () => {
    const counts = { ...healthyCounts, [A]: { fns: 0, brs: 1 } }
    expect(of(signals({ layers: emptied('fnMap'), counts }), 'empty-fn-map')).toEqual([])
  })

  it('empty-fn-map is absent when the maps are populated', () => {
    expect(of(signals(), 'empty-fn-map')).toEqual([])
  })

  it('empty-branch-map fires when a layer file has no branches but the source has conditionals', () => {
    const out = of(signals({ layers: emptied('branchMap') }), 'empty-branch-map')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/layer=bdd/)
  })

  it('empty-branch-map is absent when the source has no conditionals', () => {
    const counts = { ...healthyCounts, [A]: { fns: 1, brs: 0 } }
    expect(of(signals({ layers: emptied('branchMap'), counts }), 'empty-branch-map')).toEqual([])
  })
})

describe('signal: statement-excess', () => {
  const inventoryWith = (n: number) =>
    lib.combineCoverage({
      primary: [stmtLayer(Array.from({ length: n }, () => 1))],
      secondary: [],
    }).data
  const run = (inventoryCount: number, layerCount: number) =>
    of(
      signals({
        layers: {
          unit: {},
          storybook: {},
          bdd: stmtLayer(Array.from({ length: layerCount }, (_, i) => i)),
          e2e: {},
        },
        inventory: inventoryWith(inventoryCount),
      }),
      'statement-excess'
    )

  it('does not fire at exactly inventory + max(2, 10%) (small file: +2)', () => {
    expect(run(10, 12)).toEqual([])
  })

  it('fires one past the boundary (small file), naming layer and file', () => {
    const out = run(10, 13)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(/layer=bdd/)
    expect(out[0]).toMatch(/file=\S*src\/a\.ts/)
  })

  it('uses 10% when it exceeds 2 (50 statements: +5)', () => {
    expect(run(50, 55)).toEqual([])
    expect(run(50, 56)).toHaveLength(1)
  })
})

describe('parseBaselineFromReport and signal: coverage-movement', () => {
  const report = (stmt: string, branch: string, method: string | null) =>
    [
      '```metrics',
      'tracking_issue: 1',
      `coverage_percent: ${stmt}`,
      `branch_coverage_percent: ${branch}`,
      ...(method ? [`coverage_method: ${method}`] : []),
      '```',
    ].join('\n')

  it('parses statements, branches and method from a report metrics block', () => {
    expect(lib.parseBaselineFromReport(report('97.20', '96.01', 'v2'))).toEqual({
      statements: 97.2,
      branches: 96.01,
      method: 'v2',
    })
  })

  it('parses a real committed report', () => {
    const text = fs.readFileSync(
      path.resolve(__dirname, '../../../reports/2026-11-11-task-store-hydration-validation.md'),
      'utf8'
    )
    expect(lib.parseBaselineFromReport(text)).toEqual({
      statements: 97.2,
      branches: 96.01,
      method: 'v2',
    })
  })

  it('returns null when there is no metrics block or no coverage_method (a v1 report)', () => {
    expect(lib.parseBaselineFromReport('# no metrics here')).toBeNull()
    expect(lib.parseBaselineFromReport(report('97.20', '96.01', null))).toBeNull()
  })

  // Inventory with every statement and arm covered: statements 100%, branches 100%.
  const fullInventory = () =>
    lib.combineCoverage({
      primary: [
        layer({
          [A]: {
            statements: [
              { line: 1, hits: 1 },
              { line: 2, hits: 1 },
            ],
            branches: [{ type: 'if', line: 2, arms: [1, 1] }],
          },
        }),
      ],
      secondary: [],
    }).data
  const move = (statements: number, branches: number) =>
    of(
      signals({
        inventory: fullInventory(),
        baseline: { statements, branches, method: 'v3' },
      }),
      'coverage-movement'
    )

  it('does not fire when both figures are unchanged', () => {
    expect(move(100, 100)).toEqual([])
  })

  it('does not fire at exactly 2.0 points of movement', () => {
    expect(move(98, 100)).toEqual([])
    expect(move(100, 98)).toEqual([])
  })

  it('fires beyond 2 points (2.01) for statements or branches, and mentions the diff check', () => {
    const s = move(97.99, 100)
    expect(s).toHaveLength(1)
    expect(s[0]).toMatch(/statements?/i)
    expect(s[0]).toMatch(/diff|test|tooling/i)
    expect(move(100, 97.99)).toHaveLength(1)
  })

  it('prints no movement line when there is no baseline (first run of a method version)', () => {
    expect(
      of(signals({ inventory: fullInventory(), baseline: null }), 'coverage-movement')
    ).toEqual([])
  })
})

describe('formatSignal (REQ-013)', () => {
  it('includes the prefix, pattern, layer and file', () => {
    expect(
      lib.formatSignal({ pattern: 'empty-fn-map', layer: 'bdd', file: 'src/a.ts', detail: 'x' })
    ).toBe('Coverage signal: empty-fn-map layer=bdd file=src/a.ts x')
  })

  it('omits layer and file when not applicable', () => {
    const line = lib.formatSignal({ pattern: 'coverage-movement', detail: 'moved 3 points' })
    expect(line).toBe('Coverage signal: coverage-movement moved 3 points')
    expect(line).not.toMatch(/layer=|file=/)
  })

  it('SIGNAL_PREFIX is the exact line prefix', () => {
    expect(lib.SIGNAL_PREFIX).toBe('Coverage signal:')
  })
})
