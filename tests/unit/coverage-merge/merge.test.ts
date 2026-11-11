import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import istanbulLibCoverage from 'istanbul-lib-coverage'
// The lib (and its .d.mts) is created by the implementer; treat as untyped here.
// @ts-ignore -- module does not exist yet
import * as lib from '../../../scripts/lib/coverage-merge.mjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L = lib as any

type Pos = { line: number; col?: number; endLine?: number; endCol?: number | null }
type StmtSpec = Pos & { hits: number }
type BranchSpec = Pos & { type: string; arms: number[] }
type FnSpec = Pos & { hits: number }
type Spec = { statements?: StmtSpec[]; branches?: BranchSpec[]; functions?: FnSpec[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Layer = Record<string, any>

function loc(p: Pos) {
  const col = p.col ?? 0
  return {
    start: { line: p.line, column: col },
    end: { line: p.endLine ?? p.line, column: p.endCol === undefined ? col + 5 : p.endCol },
  }
}

function mkFile(filePath: string, spec: Spec) {
  const statementMap: Layer = {}
  const s: Layer = {}
  const branchMap: Layer = {}
  const b: Layer = {}
  const fnMap: Layer = {}
  const f: Layer = {}
  ;(spec.statements ?? []).forEach((st, i) => {
    statementMap[String(i)] = loc(st)
    s[String(i)] = st.hits
  })
  ;(spec.branches ?? []).forEach((br, i) => {
    const l = loc(br)
    branchMap[String(i)] = {
      type: br.type,
      loc: l,
      locations: br.arms.map(() => l),
      line: br.line,
    }
    b[String(i)] = [...br.arms]
  })
  ;(spec.functions ?? []).forEach((fn, i) => {
    const l = loc(fn)
    fnMap[String(i)] = { name: `fn${i}`, decl: l, loc: l, line: fn.line }
    f[String(i)] = fn.hits
  })
  return { path: filePath, statementMap, fnMap, branchMap, s, f, b }
}

function layer(files: Record<string, Spec>): Layer {
  const out: Layer = {}
  for (const [p, spec] of Object.entries(files)) out[p] = mkFile(p, spec)
  return out
}

const A = '/proj/src/a.ts'
const B = '/proj/src/b.ts'
const V = '/proj/src/A.vue'

function recount(data: Layer) {
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
  }
  for (const fc of Object.values(data)) {
    for (const h of Object.values(fc.s) as number[]) {
      totals.statements.total++
      if (h > 0) totals.statements.covered++
    }
    for (const arms of Object.values(fc.b) as number[][]) {
      for (const h of arms) {
        totals.branches.total++
        if (h > 0) totals.branches.covered++
      }
    }
    for (const h of Object.values(fc.f) as number[]) {
      totals.functions.total++
      if (h > 0) totals.functions.covered++
    }
  }
  return totals
}

const empty: Layer = {}

describe('combineCoverage', () => {
  it('U1: same statement at different columns in unit vs bdd (hit only by bdd) counts once, covered', () => {
    const unit = layer({ [A]: { statements: [{ line: 5, col: 2, hits: 0 }] } })
    const bdd = layer({ [A]: { statements: [{ line: 5, col: 4, hits: 1 }] } })
    const r = L.combineCoverage({ primary: [unit], secondary: [bdd] })
    expect(r.totals.statements).toEqual({ covered: 1, total: 1 })
  })

  it('U2: unit + storybook (column 0 / null end column), hit only in storybook, counts once covered', () => {
    const unit = layer({ [A]: { statements: [{ line: 7, col: 8, hits: 0 }] } })
    const sb = layer({ [A]: { statements: [{ line: 7, col: 0, endCol: null, hits: 3 }] } })
    const r = L.combineCoverage({ primary: [unit, sb], secondary: [] })
    expect(r.totals.statements).toEqual({ covered: 1, total: 1 })
  })

  it('U3: secondary statement with no matching key is ignored and total unchanged', () => {
    const unit = layer({ [A]: { statements: [{ line: 5, hits: 1 }] } })
    const bdd = layer({
      [A]: {
        statements: [
          { line: 5, hits: 1 },
          { line: 99, hits: 1 },
        ],
      },
    })
    const e2e = layer({
      [A]: {
        statements: [
          { line: 5, hits: 1 },
          { line: 98, hits: 1 },
        ],
      },
    })
    const r = L.combineCoverage({ primary: [unit], secondary: [bdd, e2e] })
    expect(r.totals.statements).toEqual({ covered: 1, total: 1 })
    expect(r.ignored.bdd.statements).toBe(1)
    expect(r.ignored.e2e.statements).toBe(1)
  })

  it('U4: two statements on one line covered by different layers are both counted and covered', () => {
    const unit = layer({
      [A]: {
        statements: [
          { line: 3, col: 2, hits: 1 },
          { line: 3, col: 20, hits: 0 },
        ],
      },
    })
    const sb = layer({
      [A]: {
        statements: [
          { line: 3, col: 2, hits: 0 },
          { line: 3, col: 20, hits: 1 },
        ],
      },
    })
    const r = L.combineCoverage({ primary: [unit, sb], secondary: [] })
    expect(r.totals.statements).toEqual({ covered: 2, total: 2 })
  })

  it('U5: if branch with 2 arms in primary and 1 arm (dropped else) in secondary credits arm 0 only', () => {
    const unit = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [0, 0] }] } })
    const bdd = layer({ [A]: { branches: [{ type: 'if', line: 4, col: 3, arms: [1] }] } })
    const r = L.combineCoverage({ primary: [unit], secondary: [bdd] })
    expect(r.totals.branches).toEqual({ covered: 1, total: 2 })
    expect(r.data[A].b['0']).toEqual([1, 0])

    const unit2 = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [0, 1] }] } })
    const bdd2 = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [0] }] } })
    const r2 = L.combineCoverage({ primary: [unit2], secondary: [bdd2] })
    expect(r2.totals.branches).toEqual({ covered: 1, total: 2 })
  })

  it('U6: binary-expr / cond-expr branch in both layers at different columns counts arms once', () => {
    const unit = layer({
      [A]: {
        branches: [
          { type: 'binary-expr', line: 6, col: 1, arms: [1, 0] },
          { type: 'cond-expr', line: 8, col: 1, arms: [0, 0] },
        ],
      },
    })
    const bdd = layer({
      [A]: {
        branches: [
          { type: 'binary-expr', line: 6, col: 9, arms: [1, 1] },
          { type: 'cond-expr', line: 8, col: 9, arms: [0, 1] },
        ],
      },
    })
    const r = L.combineCoverage({ primary: [unit], secondary: [bdd] })
    expect(r.totals.branches).toEqual({ covered: 3, total: 4 })
  })

  it('U7: branch only in an e2e layer at an unmatched line is ignored; denominator unchanged', () => {
    const unit = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [1, 0] }] } })
    const e2e = layer({
      [A]: {
        branches: [
          { type: 'if', line: 4, arms: [1, 0] },
          { type: 'cond-expr', line: 120, arms: [1, 1] },
        ],
      },
    })
    const r = L.combineCoverage({ primary: [unit], secondary: [empty, e2e] })
    expect(r.totals.branches).toEqual({ covered: 1, total: 2 })
    expect(r.ignored.e2e.branches).toBe(1)
  })

  it('U8: functions are de-duplicated across layers and covered if any layer hit them', () => {
    const unit = layer({
      [A]: {
        functions: [
          { line: 2, hits: 0 },
          { line: 9, hits: 0 },
        ],
      },
    })
    const sb = layer({
      [A]: {
        functions: [
          { line: 2, col: 3, hits: 4 },
          { line: 9, hits: 0 },
        ],
      },
    })
    const bdd = layer({ [A]: { functions: [{ line: 9, col: 7, hits: 1 }] } })
    const r = L.combineCoverage({ primary: [unit, sb], secondary: [bdd] })
    expect(r.totals.functions).toEqual({ covered: 2, total: 2 })
  })

  it('U9: secondary-only files are absent; primary-only zero-hit files count as uncovered', () => {
    const unit = layer({
      [A]: {
        statements: [
          { line: 1, hits: 0 },
          { line: 2, hits: 0 },
        ],
      },
    })
    const bdd = layer({ [B]: { statements: [{ line: 1, hits: 1 }] } })
    const r = L.combineCoverage({ primary: [unit], secondary: [bdd] })
    expect(Object.keys(r.data)).toEqual([A])
    expect(r.totals.statements).toEqual({ covered: 0, total: 2 })
  })

  it('U10: is deterministic across repeated runs', () => {
    const unit = layer({
      [A]: {
        statements: [
          { line: 1, hits: 1 },
          { line: 2, hits: 0 },
        ],
      },
    })
    const bdd = layer({ [A]: { statements: [{ line: 2, col: 3, hits: 1 }] } })
    const input = { primary: [unit], secondary: [bdd] }
    expect(L.combineCoverage(input)).toEqual(L.combineCoverage(input))
  })

  it('U11: is independent of primary and secondary layer order', () => {
    const unit = layer({
      [A]: {
        statements: [
          { line: 1, hits: 1 },
          { line: 2, hits: 0 },
          { line: 3, hits: 0 },
        ],
        branches: [{ type: 'if', line: 2, arms: [0, 1] }],
        functions: [{ line: 1, hits: 0 }],
      },
    })
    const sb = layer({
      [A]: {
        statements: [
          { line: 1, col: 4, hits: 0 },
          { line: 2, hits: 2 },
          { line: 3, hits: 0 },
        ],
        branches: [{ type: 'if', line: 2, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      },
    })
    const bdd = layer({ [A]: { statements: [{ line: 3, col: 1, hits: 1 }] } })
    const e2e = layer({
      [A]: {
        statements: [
          { line: 3, col: 6, hits: 1 },
          { line: 50, hits: 1 },
        ],
      },
    })
    const base = L.combineCoverage({ primary: [unit, sb], secondary: [bdd, e2e] })
    const swappedP = L.combineCoverage({ primary: [sb, unit], secondary: [bdd, e2e] })
    const swappedS = L.combineCoverage({ primary: [unit, sb], secondary: [e2e, bdd] })
    expect(swappedP.totals).toEqual(base.totals)
    expect(swappedS.totals).toEqual(base.totals)
  })

  it('R1: the same statement at two locations in a V8-shaped and an Istanbul-shaped layer counts once, not twice', () => {
    const v8 = layer({
      [A]: { statements: [{ line: 10, col: 0, endLine: 10, endCol: null, hits: 1 }] },
    })
    const istanbul = layer({
      [A]: { statements: [{ line: 10, col: 6, endLine: 10, endCol: 31, hits: 1 }] },
    })
    const r = L.combineCoverage({ primary: [v8], secondary: [istanbul] })
    expect(r.totals.statements.total).toBe(1)
  })

  it('U31: branch arms are credited by index only when safe', () => {
    const sw = layer({ [A]: { branches: [{ type: 'switch', line: 10, arms: [0, 0, 0] }] } })
    const sw2 = layer({ [A]: { branches: [{ type: 'switch', line: 10, arms: [1, 1] }] } })
    const a = L.combineCoverage({ primary: [sw], secondary: [sw2] })
    expect(a.totals.branches).toEqual({ covered: 0, total: 3 })
    expect(a.ignored.bdd.branches).toBe(1)

    const eq = layer({ [A]: { branches: [{ type: 'cond-expr', line: 3, arms: [0, 0] }] } })
    const eq2 = layer({ [A]: { branches: [{ type: 'cond-expr', line: 3, arms: [0, 1] }] } })
    const c = L.combineCoverage({ primary: [eq], secondary: [eq2] })
    expect(c.totals.branches).toEqual({ covered: 1, total: 2 })
    expect(c.data[A].b['0']).toEqual([0, 1])

    const if3 = layer({ [A]: { branches: [{ type: 'if', line: 3, arms: [0, 0, 0] }] } })
    const if1 = layer({ [A]: { branches: [{ type: 'if', line: 3, arms: [1] }] } })
    const d = L.combineCoverage({ primary: [if3], secondary: [if1] })
    expect(d.totals.branches).toEqual({ covered: 0, total: 3 })
    expect(d.ignored.bdd.branches).toBe(1)

    const bin2 = layer({ [A]: { branches: [{ type: 'binary-expr', line: 3, arms: [0, 0] }] } })
    const bin1 = layer({ [A]: { branches: [{ type: 'binary-expr', line: 3, arms: [1] }] } })
    const e = L.combineCoverage({ primary: [bin2], secondary: [bin1] })
    expect(e.totals.branches).toEqual({ covered: 0, total: 2 })
    expect(e.ignored.bdd.branches).toBe(1)
  })

  it('U32: ignored tally is per layer and kind and does not change totals', () => {
    const unit = layer({
      [A]: {
        statements: [{ line: 1, hits: 1 }],
        branches: [{ type: 'if', line: 1, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      },
    })
    const bdd = layer({
      [A]: {
        statements: [
          { line: 70, hits: 1 },
          { line: 71, hits: 1 },
        ],
        branches: [{ type: 'if', line: 72, arms: [1, 1] }],
        functions: [{ line: 73, hits: 1 }],
      },
    })
    const e2e = layer({
      [A]: {
        statements: [{ line: 80, hits: 1 }],
        functions: [
          { line: 81, hits: 1 },
          { line: 82, hits: 1 },
        ],
      },
    })
    const withSecondary = L.combineCoverage({ primary: [unit], secondary: [bdd, e2e] })
    const without = L.combineCoverage({ primary: [unit], secondary: [] })
    expect(withSecondary.totals).toEqual(without.totals)
    expect(withSecondary.ignored.bdd).toEqual({ statements: 2, branches: 1, functions: 1 })
    expect(withSecondary.ignored.e2e).toEqual({ statements: 1, branches: 0, functions: 2 })
  })
})

describe('normalizeCoverageKeys / scopeToOwnSource', () => {
  it('U12: normalises separators, rewrites path, collapses two spellings of one file', () => {
    const win = mkFile('C:\\proj\\src\\a.ts', { statements: [{ line: 1, hits: 1 }] })
    const posix = mkFile('C:/proj/src/a.ts', { statements: [{ line: 1, hits: 1 }] })
    const out = L.normalizeCoverageKeys({ 'C:\\proj\\src\\a.ts': win, 'C:/proj/src/a.ts': posix })
    expect(Object.keys(out)).toEqual(['C:/proj/src/a.ts'])
    expect(out['C:/proj/src/a.ts'].path).toBe('C:/proj/src/a.ts')
  })

  it('U12: scopeToOwnSource keeps /src/ and drops node_modules', () => {
    const data = layer({
      '/proj/src/a.ts': {},
      '/proj/node_modules/vue/src/x.ts': {},
      '/proj/tests/x.ts': {},
    })
    expect(Object.keys(L.scopeToOwnSource(data))).toEqual(['/proj/src/a.ts'])
  })
})

function realisticE2e(): Layer {
  return layer({
    [A]: {
      statements: [1, 0, 2, 1, 3, 1].map((hits, i) => ({ line: i + 1, hits })),
      branches: [{ type: 'if', line: 2, arms: [1, 0] }],
      functions: [{ line: 1, hits: 2 }],
    },
    [B]: {
      statements: [4, 1, 0, 2, 1, 1].map((hits, i) => ({ line: i + 1, hits })),
      branches: [{ type: 'cond-expr', line: 3, arms: [1, 1] }],
      functions: [{ line: 1, hits: 1 }],
    },
  })
}

describe('assertE2eLayerIsReal', () => {
  it('U13: passes for realistic data', () => {
    expect(() => L.assertE2eLayerIsReal(realisticE2e())).not.toThrow()
  })

  it('U14: fails with 0 functions', () => {
    const d = realisticE2e()
    for (const fc of Object.values(d)) {
      fc.fnMap = {}
      fc.f = {}
    }
    expect(() => L.assertE2eLayerIsReal(d)).toThrow(
      /e2e coverage layer looks flat\/fake.*functions/is
    )
  })

  it('U15: fails with 0 branches', () => {
    const d = realisticE2e()
    for (const fc of Object.values(d)) {
      fc.branchMap = {}
      fc.b = {}
    }
    expect(() => L.assertE2eLayerIsReal(d)).toThrow(
      /e2e coverage layer looks flat\/fake.*branches/is
    )
  })

  it('U16: fails when no statement has a zero hit count', () => {
    const d = realisticE2e()
    for (const fc of Object.values(d)) {
      for (const k of Object.keys(fc.s)) if (fc.s[k] === 0) fc.s[k] = 1
    }
    expect(() => L.assertE2eLayerIsReal(d)).toThrow(/e2e coverage layer looks flat\/fake.*zero/is)
  })

  it('U17: fails on flat data (old fake shape) and tolerates a lone tiny uniform file', () => {
    const flat: Layer = {}
    for (const n of ['a', 'b', 'c', 'd']) {
      const p = `/proj/src/${n}.ts`
      flat[p] = mkFile(p, {
        statements: [1, 2, 3, 4, 5, 6].map((_, i) => ({ line: i + 1, hits: 1 })),
        branches: [{ type: 'if', line: 1, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      })
    }
    const tiny = '/proj/src/tiny.ts'
    flat[tiny] = mkFile(tiny, {
      statements: [
        { line: 1, hits: 1 },
        { line: 2, hits: 0 },
      ],
    })
    expect(() => L.assertE2eLayerIsReal(flat)).toThrow(
      /e2e coverage layer looks flat\/fake.*(single-valued|uniform)/is
    )

    const ok = realisticE2e()
    const tinyUniform = '/proj/src/uniform.ts'
    ok[tinyUniform] = mkFile(tinyUniform, {
      statements: [
        { line: 1, hits: 1 },
        { line: 2, hits: 1 },
      ],
    })
    expect(() => L.assertE2eLayerIsReal(ok)).not.toThrow()
  })
})

describe('assertDedupeEffective', () => {
  function multi() {
    const unit = layer({
      [A]: {
        statements: [
          { line: 1, hits: 1 },
          { line: 2, hits: 0 },
          { line: 3, hits: 1 },
        ],
        branches: [{ type: 'if', line: 2, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      },
    })
    const sb = layer({
      [A]: {
        statements: [
          { line: 1, hits: 0 },
          { line: 2, hits: 1 },
          { line: 3, hits: 0 },
          { line: 4, hits: 0 },
        ],
        branches: [{ type: 'if', line: 2, arms: [0, 1] }],
        functions: [{ line: 1, hits: 0 }],
      },
    })
    const bdd = layer({
      [A]: {
        statements: [
          { line: 1, col: 2, hits: 1 },
          { line: 60, hits: 1 },
        ],
      },
    })
    return { primary: [unit, sb], secondary: [bdd] }
  }

  it('U18: passes on good combineCoverage output for multi-layer input', () => {
    const layers = multi()
    const result = L.combineCoverage(layers)
    expect(() => L.assertDedupeEffective(layers, result)).not.toThrow()
  })

  it('U19: fails when merged statement count exceeds the bound', () => {
    const layers = multi()
    const result = L.combineCoverage(layers)
    const tampered = structuredClone(result)
    const fc = tampered.data[A]
    for (let i = 0; i < 6; i++) {
      const id = String(100 + i)
      fc.statementMap[id] = loc({ line: 200 + i })
      fc.s[id] = 1
    }
    tampered.totals = recount(tampered.data)
    expect(() => L.assertDedupeEffective(layers, tampered)).toThrow()
  })

  it('U19: fails when merged statement count is below the recomputed universe size', () => {
    const layers = multi()
    const result = L.combineCoverage(layers)
    const tampered = structuredClone(result)
    const fc = tampered.data[A]
    const id = Object.keys(fc.s)[0] as string
    delete fc.s[id]
    delete fc.statementMap[id]
    tampered.totals = recount(tampered.data)
    expect(() => L.assertDedupeEffective(layers, tampered)).toThrow()
  })

  it('U20: fails on zero merged statements', () => {
    const layers = { primary: [layer({ [A]: {} })], secondary: [] }
    const result = { data: layer({ [A]: {} }), totals: recount(layer({ [A]: {} })) }
    expect(() => L.assertDedupeEffective(layers, result)).toThrow()
  })

  it('R2: a naive FileCoverage.merge of V8-shaped and Istanbul-shaped layers is rejected', () => {
    const lines = [1, 2, 3, 4]
    const unit = layer({
      [A]: {
        statements: lines.map((line) => ({ line, col: 0, hits: 1 })),
        branches: [{ type: 'if', line: 2, col: 0, arms: [1, 0] }],
      },
    })
    const bdd = layer({
      [A]: {
        statements: lines.map((line) => ({ line, col: 4, hits: 1 })),
        branches: [{ type: 'if', line: 2, col: 4, arms: [1, 0] }],
      },
    })
    const map = istanbulLibCoverage.createCoverageMap(structuredClone(unit))
    map.merge(structuredClone(bdd))
    const naive = map.toJSON() as Layer
    // sanity: the naive merge really did double count
    expect(Object.keys(naive[A].s).length).toBe(8)
    const layers = { primary: [unit], secondary: [bdd] }
    expect(() => L.assertDedupeEffective(layers, { data: naive, totals: recount(naive) })).toThrow()
  })
})

describe('assertE2eTemplateParity', () => {
  const source = [
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
  const readSource = () => source

  const stmts = (lines: number[]) => lines.map((line) => ({ line, hits: 1 }))

  it('U21: passes when e2e counts are at/below unit and no statement is on markup/style/comment', () => {
    const unit = layer({ [V]: { statements: stmts([5, 8]) } })
    const e2e = layer({ [V]: { statements: stmts([5, 8]) } })
    expect(() => L.assertE2eTemplateParity(e2e, unit, readSource)).not.toThrow()
  })

  it('U22: fails when e2e count exceeds unit by more than max(2, 10%) (old 601 vs 55 shape)', () => {
    const unit = layer({
      [V]: { statements: Array.from({ length: 55 }, (_, i) => ({ line: 5, col: i, hits: 1 })) },
    })
    const e2e = layer({
      [V]: { statements: Array.from({ length: 601 }, (_, i) => ({ line: 5, col: i, hits: 1 })) },
    })
    expect(() => L.assertE2eTemplateParity(e2e, unit, readSource)).toThrow(/A\.vue/)
  })

  it('U23: fails when an e2e statement sits inside the <style> block', () => {
    const unit = layer({ [V]: { statements: stmts([5, 8, 11]) } })
    const e2e = layer({ [V]: { statements: stmts([5, 8, 11]) } })
    expect(() => L.assertE2eTemplateParity(e2e, unit, readSource)).toThrow(/A\.vue.*11/s)
  })

  it('U24: fails when an e2e statement is on a blank or comment-only line', () => {
    const unit = layer({ [V]: { statements: stmts([5, 8, 5]) } })
    const blank = layer({ [V]: { statements: stmts([5, 6, 8]) } })
    const comment = layer({ [V]: { statements: stmts([5, 7, 8]) } })
    expect(() => L.assertE2eTemplateParity(blank, unit, readSource)).toThrow(/A\.vue.*6/s)
    expect(() => L.assertE2eTemplateParity(comment, unit, readSource)).toThrow(/A\.vue.*7/s)
  })
})

describe('assertUniverseComplete', () => {
  it('U25: passes when the universe equals the on-disk set; UNIVERSE_EXCLUDES covers main.ts and stories', () => {
    const files = ['/proj/src/a.ts', '/proj/src/b.vue']
    expect(() => L.assertUniverseComplete(files, [...files].reverse())).not.toThrow()
    const ex = JSON.stringify(L.UNIVERSE_EXCLUDES)
    expect(ex).toContain('src/main.ts')
    expect(ex).toContain('stories')
  })

  it('U26: throws naming an on-disk source file missing from the universe', () => {
    expect(() =>
      L.assertUniverseComplete(['/proj/src/a.ts'], ['/proj/src/a.ts', '/proj/src/missing.ts'])
    ).toThrow(/src\/missing\.ts/)
  })

  it('U27: throws when the universe contains a file not on disk', () => {
    expect(() =>
      L.assertUniverseComplete(['/proj/src/a.ts', '/proj/src/ghost.ts'], ['/proj/src/a.ts'])
    ).toThrow(/src\/ghost\.ts/)
  })
})

describe('loadLayers', () => {
  function makeDir(layers: string[]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covmerge-'))
    for (const name of layers) {
      fs.mkdirSync(path.join(dir, name), { recursive: true })
      const data = layer({
        'C:\\proj\\src\\a.ts': { statements: [{ line: 1, hits: 1 }] },
        'C:\\proj\\node_modules\\x\\src\\y.ts': { statements: [{ line: 1, hits: 1 }] },
      })
      fs.writeFileSync(path.join(dir, name, 'coverage-final.json'), JSON.stringify(data))
    }
    return dir
  }

  it('U33: loads all four layers normalised and scoped to own source', () => {
    const dir = makeDir(['unit', 'storybook', 'bdd', 'e2e'])
    try {
      const out = L.loadLayers(dir)
      expect(Object.keys(out).sort()).toEqual(['bdd', 'e2e', 'storybook', 'unit'])
      expect(Object.keys(out.unit)).toEqual(['C:/proj/src/a.ts'])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('U33: a missing e2e layer file throws (does not warn)', () => {
    const dir = makeDir(['unit', 'storybook', 'bdd'])
    try {
      expect(() => L.loadLayers(dir)).toThrow(/e2e/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('U33: a missing primary layer file throws', () => {
    const dir = makeDir(['storybook', 'bdd', 'e2e'])
    try {
      expect(() => L.loadLayers(dir)).toThrow(/unit/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
