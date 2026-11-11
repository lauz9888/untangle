import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as lib from '../../../scripts/lib/coverage-merge.mjs'
import { A_SRC, CAL_SRC, goodLayers, layer, mkFile, srcText, type Layer } from './fixtures'

// Validity checks 1-8 (#215): a pass test and a fail test for each (REQ-023), plus the
// REQ-008/009/010/012/014/016/017/019/020 behaviours that are checks.

const A = '/proj/src/a.ts'
const CAL = '/proj/src/cal.ts'
const UNTESTED = '/proj/src/untested.ts'
const LAYER_NAMES = ['unit', 'storybook', 'bdd', 'e2e'] as const
const sources: Record<string, string> = {
  [A]: A_SRC,
  [CAL]: CAL_SRC,
  [UNTESTED]: 'const u = 1\nconst w = 2',
}
const readSource = (f: string) => sources[f] as string

// ---------------------------------------------------------------------------
// Check 2: zero totals (REQ-016)
// ---------------------------------------------------------------------------
describe('assertTotalsNonZero (check 2)', () => {
  const t = (s: [number, number], b: [number, number]) => ({
    statements: { covered: s[0], total: s[1] },
    branches: { covered: b[0], total: b[1] },
    functions: { covered: 0, total: 0 },
  })

  it('passes when both totals are non-zero', () => {
    expect(() => lib.assertTotalsNonZero(t([1, 2], [1, 2]))).not.toThrow()
  })

  it('fails when the statement total is zero', () => {
    expect(() => lib.assertTotalsNonZero(t([0, 0], [1, 2]))).toThrow(/statement/i)
  })

  it('fails when the branch total is zero (separately from statements)', () => {
    expect(() => lib.assertTotalsNonZero(t([1, 2], [0, 0]))).toThrow(/branch/i)
  })
})

// ---------------------------------------------------------------------------
// Check 1: layer file missing / unparseable (REQ-016), plus scoping on load
// ---------------------------------------------------------------------------
describe('loadLayers (check 1)', () => {
  function makeDir(contents: Record<string, string>) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covchecks-'))
    for (const [name, text] of Object.entries(contents)) {
      fs.mkdirSync(path.join(dir, name), { recursive: true })
      fs.writeFileSync(path.join(dir, name, 'coverage-final.json'), text)
    }
    return dir
  }
  const ok = JSON.stringify(
    layer({ 'C:\\proj\\src\\a.ts': { statements: [{ line: 1, hits: 1 }] } })
  )

  it('an unparseable coverage-final.json throws an error naming the layer', () => {
    const dir = makeDir({ unit: ok, storybook: ok, bdd: '{ not json', e2e: ok })
    try {
      expect(() => lib.loadLayers(dir)).toThrow(/unparseable.*bdd|bdd.*unparseable/is)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('drops out-of-scope files (src/main.ts) from every layer on load', () => {
    const withMain = JSON.stringify(
      layer({
        'C:\\proj\\src\\a.ts': { statements: [{ line: 1, hits: 1 }] },
        'C:\\proj\\src\\main.ts': { statements: [{ line: 4, hits: 1 }] },
      })
    )
    const dir = makeDir({ unit: ok, storybook: ok, bdd: ok, e2e: withMain })
    try {
      expect(Object.keys(lib.loadLayers(dir).e2e)).toEqual(['C:/proj/src/a.ts'])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// Check 5: statement on non-code, applied to the inventory (REQ-017)
// ---------------------------------------------------------------------------
describe('assertNoStatementOnNonCode (check 5)', () => {
  const V = '/proj/src/A.vue'
  const vue = [
    '<template>', // 1
    '  <div />', // 2
    '</template>', // 3
    '<script setup lang="ts">', // 4
    'const a = 1', // 5
    '', // 6
    '// a comment', // 7
    'const b = 2', // 8
    '</script>', // 9
    '<style scoped>', // 10
    '.a { color: red }', // 11
    '</style>', // 12
  ].join('\n')
  const inv = (lines: number[]) =>
    lib.combineCoverage({
      primary: [layer({ [V]: { statements: lines.map((line) => ({ line, hits: 1 })) } })],
      secondary: [],
    }).data

  it('passes on a clean inventory', () => {
    expect(() => lib.assertNoStatementOnNonCode(inv([5, 8]), () => vue, 'inventory')).not.toThrow()
  })

  it.each([
    ['blank', 6],
    ['comment-only', 7],
    ['<style>', 11],
  ])(
    'fails when an inventory statement sits on a %s line, naming the label, file and line',
    (_n, line) => {
      expect(() => lib.assertNoStatementOnNonCode(inv([5, line]), () => vue, 'inventory')).toThrow(
        new RegExp(`inventory[\\s\\S]*A\\.vue[\\s\\S]*${line}`)
      )
    }
  )
})

// ---------------------------------------------------------------------------
// Check 7: calibration statement (REQ-008, 009, 010, 019)
// ---------------------------------------------------------------------------
describe('checkCalibration (check 7)', () => {
  const calLayer = (hits: number) =>
    layer({ [CAL]: { statements: [{ line: 2, hits }], functions: [{ line: 1, hits: 0 }] } })
  const layersWith = (over: Partial<Record<(typeof LAYER_NAMES)[number], Layer>> = {}) => ({
    unit: calLayer(0),
    storybook: calLayer(0),
    bdd: calLayer(0),
    e2e: calLayer(0),
    ...over,
  })
  const inventoryOf = (l: ReturnType<typeof layersWith>) =>
    lib.combineCoverage({ primary: [l.unit, l.storybook], secondary: [l.bdd, l.e2e] }).data
  const sites = [{ file: CAL, line: 2 }]
  const zero = layersWith()
  const run = (
    layers: ReturnType<typeof layersWith>,
    inventory: Layer = inventoryOf(zero),
    s = sites
  ) => lib.checkCalibration({ layers, inventory, sites: s })

  it('passes when all four layers report the statement at 0 and the merged inventory has it at 0', () => {
    expect(() => run(zero)).not.toThrow()
  })

  it.each(LAYER_NAMES)('fails naming the layer when only %s reports the statement hit', (name) => {
    const bad = layersWith({ [name]: calLayer(3) })
    expect(() => run(bad)).toThrow(new RegExp(name))
  })

  it.each(LAYER_NAMES)(
    'fails naming the layer when %s omits the calibration file entirely',
    (name) => {
      const bad = layersWith({ [name]: layer({ [A]: { statements: [{ line: 1, hits: 0 }] } }) })
      expect(() => run(bad)).toThrow(new RegExp(`${name}[\\s\\S]*omit|omit[\\s\\S]*${name}`, 'i'))
    }
  )

  it.each(LAYER_NAMES)(
    'fails naming the layer when %s has the file but no statement on the marker line',
    (name) => {
      const bad = layersWith({ [name]: layer({ [CAL]: { statements: [{ line: 9, hits: 0 }] } }) })
      expect(() => run(bad)).toThrow(new RegExp(`${name}[\\s\\S]*omit|omit[\\s\\S]*${name}`, 'i'))
    }
  )

  it('fails when the merged inventory is missing the statement', () => {
    const inv = inventoryOf(zero)
    delete inv[CAL].statementMap['0']
    delete inv[CAL].s['0']
    expect(() => run(zero, inv)).toThrow(/inventory|combined|merged/i)
  })

  it('fails when the merged inventory reports the statement as covered', () => {
    const inv = inventoryOf(zero)
    inv[CAL].s['0'] = 1
    expect(() => run(zero, inv)).toThrow(/inventory|combined|merged/i)
  })

  it('fails when no calibration site (zero markers) was found', () => {
    expect(() => run(zero, inventoryOf(zero), [])).toThrow(/marker|site|exactly one|zero|none/i)
  })

  it('fails when more than one calibration site (two markers) was found', () => {
    const two = [...sites, { file: A, line: 3 }]
    expect(() => run(zero, inventoryOf(zero), two)).toThrow(
      /marker|site|exactly one|two|more than|multiple/i
    )
  })

  it('finds the statement by the located line, so a relocated statement still passes (REQ-010)', () => {
    const moved = (hits: number) =>
      layer({ [CAL]: { statements: [{ line: 12, hits }], functions: [{ line: 11, hits: 0 }] } })
    const l = layersWith({ unit: moved(0), storybook: moved(0), bdd: moved(0), e2e: moved(0) })
    expect(() => run(l, inventoryOf(l), [{ file: CAL, line: 12 }])).not.toThrow()
    const hit = layersWith({ unit: moved(0), storybook: moved(0), bdd: moved(0), e2e: moved(1) })
    expect(() => run(hit, inventoryOf(l), [{ file: CAL, line: 12 }])).toThrow(/e2e/)
  })
})

// ---------------------------------------------------------------------------
// Check 8: determinism (REQ-014)
// ---------------------------------------------------------------------------
describe('checkDeterminism (check 8)', () => {
  const l = goodLayers(A, CAL)
  const input = {
    primary: [l.unit, l.storybook],
    secondary: [l.bdd, l.e2e],
    secondaryNames: ['bdd', 'e2e'],
    readSource,
  }
  const totals = (covered: number) => ({
    statements: { covered, total: 3 },
    branches: { covered: 1, total: 2 },
    functions: { covered: 0, total: 0 },
  })
  const reconciliation = { classes: {}, unclassified: [] }

  it('passes for an order-independent input using the real combine', () => {
    expect(() => lib.checkDeterminism(input, {})).not.toThrow()
  })

  it('fails, showing both figures, for a deliberately order-dependent combine', () => {
    const first = input.primary[0]
    const combine = (inp: { primary: unknown[] }) => ({
      data: {},
      totals: totals(inp.primary[0] === first ? 1 : 2),
      reconciliation,
    })
    expect(() => lib.checkDeterminism(input, { combine })).toThrow(
      /1\/3[\s\S]*2\/3|2\/3[\s\S]*1\/3/
    )
  })

  it('fails when per-class counts differ between the two orders', () => {
    const first = input.primary[0]
    const combine = (inp: { primary: unknown[] }) => ({
      data: {},
      totals: totals(1),
      reconciliation: {
        classes: { 'bdd-commonjs-emit': { total: inp.primary[0] === first ? 1 : 2, byLayer: {} } },
        unclassified: [],
      },
    })
    expect(() => lib.checkDeterminism(input, { combine })).toThrow(/bdd-commonjs-emit|class/i)
  })

  it('fails with the error when the second computation throws, rather than skipping', () => {
    let calls = 0
    const combine = () => {
      calls++
      if (calls === 2) throw new Error('boom from the reversed run')
      return { data: {}, totals: totals(1), reconciliation }
    }
    expect(() => lib.checkDeterminism(input, { combine })).toThrow(/boom from the reversed run/)
  })
})

// ---------------------------------------------------------------------------
// e2e guard: the new objective-evidence predicate (REQ-012)
// ---------------------------------------------------------------------------
describe('assertE2eLayerIsReal (objective-evidence predicate)', () => {
  const fileOf = (n: string, hits: number[]) =>
    mkFile(`/proj/src/${n}.ts`, {
      statements: hits.map((h, i) => ({ line: i + 1, hits: h })),
      branches: [{ type: 'if', line: 1, arms: [1, 0] }],
      functions: [{ line: 1, hits: 1 }],
    })

  it('throws on a fully flat layer even when every file is tiny (every statement hit exactly once)', () => {
    const flat: Layer = {}
    for (const n of ['a', 'b']) flat[`/proj/src/${n}.ts`] = fileOf(n, [1, 1])
    expect(() => lib.assertE2eLayerIsReal(flat)).toThrow(/e2e coverage layer looks flat\/fake/i)
  })

  it('throws on the degenerate all-zero layer', () => {
    const zero: Layer = { [A]: fileOf('a', [0, 0, 0, 0, 0, 0]) }
    expect(() => lib.assertE2eLayerIsReal(zero)).toThrow(/e2e coverage layer looks flat\/fake/i)
  })

  it('does not throw when every file is uniform but the files differ in value (advisory only)', () => {
    const d: Layer = {}
    ;[1, 2, 3, 4, 5].forEach((v, i) => {
      d[`/proj/src/f${i}.ts`] = fileOf(`f${i}`, [v, v, v, v, v, v])
    })
    expect(() => lib.assertE2eLayerIsReal(d)).not.toThrow()
  })

  it('does not throw when 60% of large files are single-hit but the layer is not flat', () => {
    const d: Layer = {}
    ;[0, 1, 2].forEach((i) => (d[`/proj/src/u${i}.ts`] = fileOf(`u${i}`, [1, 1, 1, 1, 1, 1])))
    ;[0, 1].forEach((i) => (d[`/proj/src/m${i}.ts`] = fileOf(`m${i}`, [3, 0, 1, 0, 2, 5])))
    expect(() => lib.assertE2eLayerIsReal(d)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// analyzeCoverage: wiring of the checks, zero-hit insertion (REQ-007, 009, 016, 020)
// ---------------------------------------------------------------------------
describe('analyzeCoverage', () => {
  type Check = { id: number | string; ok: boolean; message?: string }
  const byId = (checks: Check[], n: number) =>
    checks.find((c) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(String(c.id))) as Check

  const spec: Record<string, { lines?: number[]; fns: number; brs: number }> = {
    [A]: { fns: 1, brs: 1 },
    [CAL]: { fns: 1, brs: 0 },
    [UNTESTED]: { lines: [1, 2], fns: 0, brs: 0 },
  }
  // Enumerate stub: Istanbul-shaped zero-hit coverage, plus function/branch counts for
  // the empty-map signals. Throws for unknown files (an "unparseable" file).
  const enumerate = (file: string) => {
    const sp = spec[file]
    if (!sp) throw new Error(`cannot parse ${file}`)
    return {
      ...mkFile(file, { statements: (sp.lines ?? []).map((line) => ({ line, hits: 0 })) }),
      functions: sp.fns,
      branches: sp.brs,
    }
  }
  const analyze = (over: Record<string, unknown> = {}) =>
    lib.analyzeCoverage({
      layers: goodLayers(A, CAL),
      diskFiles: [A, CAL],
      readSource,
      enumerate,
      baseline: null,
      ...over,
    })

  it('a good run passes checks 2 to 8, merges to the expected totals and prints the contract lines last', () => {
    const out = analyze()
    for (let n = 2; n <= 8; n++) {
      const c = byId(out.checks, n)
      expect(c, `check ${n} present`).toBeDefined()
      expect(c.ok, `check ${n}: ${c?.message}`).toBe(true)
    }
    expect(out.result.totals.statements).toEqual({ covered: 4, total: 6 })
    expect(out.result.totals.branches).toEqual({ covered: 2, total: 2 })
    expect(out.lines.slice(-2)).toEqual([
      'Combined coverage: 66.67% (4/6 statements)',
      'Combined branch coverage: 100.00% (2/2 branches)',
    ])
  })

  it('a file on disk that no layer reports is inserted with every statement at 0 hits and check 3 passes (REQ-020, 007)', () => {
    const out = analyze({ diskFiles: [A, CAL, UNTESTED] })
    const fc = out.result.data[UNTESTED]
    expect(fc).toBeDefined()
    expect(Object.keys(fc.s)).toHaveLength(2)
    expect(Object.values(fc.s)).toEqual([0, 0])
    expect(byId(out.checks, 3).ok).toBe(true)
    expect(out.result.totals.statements).toEqual({ covered: 4, total: 8 })
  })

  it('an untested file that cannot be parsed fails check 3 naming the file, without throwing out of the analysis', () => {
    const out = analyze({
      diskFiles: [A, CAL, UNTESTED],
      enumerate: (f: string) => {
        if (f === UNTESTED) throw new Error('syntax error in untested.ts')
        return enumerate(f)
      },
    })
    const c3 = byId(out.checks, 3)
    expect(c3.ok).toBe(false)
    expect(c3.message).toMatch(/untested\.ts/)
  })

  it('a calibration statement hit in the e2e layer fails check 7 naming e2e, and no Combined line is printed', () => {
    const layers = goodLayers(A, CAL)
    layers.e2e = layer({
      ...layers.e2e,
      [CAL]: { statements: [{ line: 2, hits: 4 }], functions: [{ line: 1, hits: 0 }] },
    })
    const out = analyze({ layers })
    const c7 = byId(out.checks, 7)
    expect(c7.ok).toBe(false)
    expect(c7.message).toMatch(/e2e/)
    expect(out.lines.some((l: string) => l.startsWith('Combined'))).toBe(false)
  })

  it('an unclassified secondary-only item fails check 4, is listed in the output, and no Combined line is printed', () => {
    const layers = goodLayers(A, CAL)
    layers.bdd[A] = mkFile(A, {
      statements: [1, 2, 3, 4, 6, 99].map((line) => ({ line, hits: 1 })),
    })
    const out = analyze({
      layers,
      readSource: (f: string) => (f === A ? srcText({}, 100) : readSource(f)),
    })
    expect(byId(out.checks, 4).ok).toBe(false)
    expect(out.lines).toContain('Unclassified secondary-only item: src/a.ts:99 statement (bdd)')
    expect(out.lines.some((l: string) => l.startsWith('Combined'))).toBe(false)
  })

  it('an out-of-scope src/main.ts reported by the e2e layer is not unclassified', () => {
    const layers = goodLayers(A, CAL)
    layers.e2e['/proj/src/main.ts'] = mkFile('/proj/src/main.ts', {
      statements: [{ line: 4, hits: 1 }],
    })
    const out = analyze({ layers })
    expect(byId(out.checks, 4).ok).toBe(true)
  })

  it('reports every failing check in one run: an unclassified item and a calibration hit both fail', () => {
    const layers = goodLayers(A, CAL)
    layers.bdd[A] = mkFile(A, {
      statements: [1, 2, 3, 4, 6, 99].map((line) => ({ line, hits: 1 })),
    })
    layers.unit[CAL] = mkFile(CAL, {
      statements: [{ line: 2, hits: 1 }],
      functions: [{ line: 1, hits: 0 }],
    })
    const out = analyze({
      layers,
      readSource: (f: string) => (f === A ? srcText({}, 100) : readSource(f)),
    })
    expect(byId(out.checks, 4).ok).toBe(false)
    expect(byId(out.checks, 7).ok).toBe(false)
  })

  it('zero totals fail check 2 and never throw or print a Combined line', () => {
    const empty = { unit: {}, storybook: {}, bdd: {}, e2e: {} }
    const out = analyze({ layers: empty, diskFiles: [] })
    expect(byId(out.checks, 2).ok).toBe(false)
    expect(out.lines.some((l: string) => l.startsWith('Combined'))).toBe(false)
  })

  it('a signal-only run (uniform bdd hit counts) leaves every check passing', () => {
    const layers = goodLayers(A, CAL)
    layers.bdd[A] = mkFile(A, {
      statements: [1, 2, 3, 4, 6].map((line) => ({ line, hits: 1 })),
      branches: [{ type: 'if', line: 3, arms: [0, 1] }],
      functions: [{ line: 1, hits: 1 }],
    })
    const out = analyze({ layers })
    expect(out.checks.every((c: Check) => c.ok)).toBe(true)
    expect(
      out.signals.some((s: string) => s.startsWith('Coverage signal: uniform-hit-counts'))
    ).toBe(true)
  })
})
