// Shared synthetic-coverage builders for the tests/unit/coverage-merge/ files.
// Not a test file (the unit include glob is *.test.ts).

export type Pos = { line: number; col?: number; endLine?: number; endCol?: number | null }
export type StmtSpec = Pos & { hits: number }
export type BranchSpec = Pos & { type: string; arms: number[] }
export type FnSpec = Pos & { hits: number }
export type Spec = { statements?: StmtSpec[]; branches?: BranchSpec[]; functions?: FnSpec[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Layer = Record<string, any>

export function loc(p: Pos) {
  const col = p.col ?? 0
  return {
    start: { line: p.line, column: col },
    end: { line: p.endLine ?? p.line, column: p.endCol === undefined ? col + 5 : p.endCol },
  }
}

export function mkFile(filePath: string, spec: Spec) {
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

export function layer(files: Record<string, Spec>): Layer {
  const out: Layer = {}
  for (const [p, spec] of Object.entries(files)) out[p] = mkFile(p, spec)
  return out
}

/** A source text whose line `n` is `overrides[n]` or an ordinary code line. */
export function srcText(overrides: Record<number, string>, lineCount = 130): string {
  const lines: string[] = []
  for (let n = 1; n <= lineCount; n++) lines.push(overrides[n] ?? `const v${n} = ${n}`)
  return lines.join('\n')
}

/**
 * A .vue source: `<template>` on line 1 (column 0), `</template>` on `templateEnd`
 * (column 0), then a `<script setup>` block. Template lines are `  <p />`.
 */
export function vueText(templateEnd = 130): string {
  const lines = ['<template>']
  for (let n = 2; n < templateEnd; n++) lines.push('  <p />')
  lines.push('</template>')
  lines.push('<script setup lang="ts">')
  lines.push('const a = 1')
  lines.push('</script>')
  return lines.join('\n')
}

export const MARKER = 'coverage-calibration-statement'

export const A_SRC = ['const a = 1', 'const b = 2', 'if (a) {', '  b', '}', 'const c = 3'].join(
  '\n'
)
export const CAL_SRC = [
  'export function calUnreachable(): number {',
  `  return 0 // ${MARKER}`,
  '}',
].join('\n')

/**
 * Four healthy layers over two files. Inventory result: statements 4/6,
 * branches 2/2 (a.ts: 5 statements, one `if`; cal.ts: the calibration
 * statement on line 2, hit by nobody).
 */
export function goodLayers(aPath: string, calPath: string) {
  const cal = { statements: [{ line: 2, hits: 0 }], functions: [{ line: 1, hits: 0 }] }
  const lines = [1, 2, 3, 4, 6]
  const stmts = (hits: number[]) => lines.map((line, i) => ({ line, hits: hits[i] as number }))
  return {
    unit: layer({
      [aPath]: {
        statements: stmts([2, 1, 1, 0, 3]),
        branches: [{ type: 'if', line: 3, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      },
      [calPath]: cal,
    }),
    storybook: layer({
      [aPath]: {
        statements: stmts([1, 0, 0, 0, 0]),
        branches: [{ type: 'if', line: 3, arms: [0, 0] }],
        functions: [{ line: 1, hits: 0 }],
      },
      [calPath]: cal,
    }),
    bdd: layer({
      [aPath]: {
        statements: stmts([1, 1, 0, 0, 1]),
        branches: [{ type: 'if', line: 3, arms: [0, 1] }],
        functions: [{ line: 1, hits: 1 }],
      },
      [calPath]: cal,
    }),
    e2e: layer({
      [aPath]: {
        statements: stmts([3, 0, 1, 0, 2]),
        branches: [{ type: 'if', line: 3, arms: [1, 0] }],
        functions: [{ line: 1, hits: 1 }],
      },
      [calPath]: cal,
    }),
  }
}

export function recount(data: Layer) {
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
