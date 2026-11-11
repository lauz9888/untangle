import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import * as lib from '../../../scripts/lib/coverage-merge.mjs'
import { layer, srcText, vueText } from './fixtures'

// Artefact-class reconciliation (#215): REQ-001 to REQ-005, REQ-022, REQ-029 and the
// design's A1 advisory note.

const A = '/proj/src/a.ts'
const B = '/proj/src/b.ts'
const V = '/proj/src/A.vue'
const MAIN = '/proj/src/main.ts'

const CLASS_IDS = [
  'bdd-commonjs-emit',
  'e2e-vue-template-branch',
  'e2e-vue-template-expression',
  'unalignable-branch-arm',
]

type Reconciliation = {
  classes: Record<string, { total: number; byLayer: Record<string, number> }>
  unclassified: { file: string; line: number; kind: string; layer: string }[]
}

const count = (r: { reconciliation: Reconciliation }, id: string) =>
  r.reconciliation.classes[id]?.total ?? 0

/** Unit layer that owns file A (line 1) and V (script line) so secondary files are in the inventory. */
function primary() {
  return layer({
    [A]: { statements: [{ line: 1, hits: 1 }] },
    [V]: { statements: [{ line: 132, hits: 1 }] },
  })
}

function sources(overrides: Record<string, string> = {}) {
  const files: Record<string, string> = { [A]: srcText({}), [B]: srcText({}), [V]: vueText(130) }
  return (f: string) => (overrides[f] ?? files[f]) as string
}

function combine(
  secondary: Record<string, unknown>[],
  readSource: (f: string) => string = sources(),
  names?: string[]
) {
  return lib.combineCoverage({
    primary: [primary()],
    secondary,
    ...(names ? { secondaryNames: names } : {}),
    readSource,
  })
}

describe('ARTEFACT_CLASSES (REQ-005)', () => {
  it('has the four declared class ids', () => {
    expect(lib.ARTEFACT_CLASSES.map((c: { id: string }) => c.id).sort()).toEqual(CLASS_IDS)
  })

  it('matches the class ids listed in STANDARDS.md "Known secondary-only artefact classes", whatever their number', () => {
    const text = fs.readFileSync(path.resolve(__dirname, '../../../.claude/STANDARDS.md'), 'utf8')
    const start = text.indexOf('Known secondary-only artefact classes')
    expect(start).toBeGreaterThan(-1)
    const rest = text.slice(start)
    const end = rest.search(/^#{2,3} /m)
    const region = end === -1 ? rest : rest.slice(0, end)
    const ids = new Set<string>()
    for (const m of region.matchAll(/`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g)) ids.add(m[1] as string)
    expect(ids.size).toBeGreaterThan(0)
    expect([...ids].sort()).toEqual(
      (lib.ARTEFACT_CLASSES as { id: string }[]).map((c) => c.id).sort()
    )
  })

  it('combineCoverage reports an entry (count 0 included) for every declared class', () => {
    const r = combine([])
    expect(Object.keys(r.reconciliation.classes).sort()).toEqual(CLASS_IDS)
    for (const id of CLASS_IDS) expect(count(r, id)).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([])
  })
})

describe('class 1: bdd-commonjs-emit (REQ-001)', () => {
  const bddAt = (line: number, kind: 'statements' | 'functions' = 'statements') =>
    layer({ [A]: { [kind]: [{ line, hits: 1 }] } })

  it.each([
    ['import', "import x from 'y'"],
    ['export function', 'export function foo() {'],
    ['export async function', 'export async function foo() {'],
    ['export const', 'export const x = 1'],
  ])('a bdd statement on a line starting with `%s` is counted under the class', (_n, text) => {
    const r = combine([bddAt(50)], sources({ [A]: srcText({ 50: text }) }))
    expect(count(r, 'bdd-commonjs-emit')).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([])
  })

  it('tolerates leading whitespace on the source line (trimmed)', () => {
    const r = combine([bddAt(50)], sources({ [A]: srcText({ 50: "  import x from 'y'" }) }))
    expect(count(r, 'bdd-commonjs-emit')).toBe(1)
  })

  it('a bdd statement on an ordinary code line is unclassified (class 1 is not "any bdd statement")', () => {
    const r = combine([bddAt(50)])
    expect(count(r, 'bdd-commonjs-emit')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'statement', layer: 'bdd' }),
    ])
  })

  it('an e2e statement on an import line in a .ts file is unclassified (class 1 is bdd-only)', () => {
    const r = combine([{}, bddAt(50)], sources({ [A]: srcText({ 50: "import x from 'y'" }) }))
    expect(count(r, 'bdd-commonjs-emit')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'statement', layer: 'e2e' }),
    ])
  })

  it('a bdd function on an export function line is unclassified (class 1 is statement-only)', () => {
    const r = combine(
      [bddAt(50, 'functions')],
      sources({ [A]: srcText({ 50: 'export function foo() {' }) })
    )
    expect(count(r, 'bdd-commonjs-emit')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'function', layer: 'bdd' }),
    ])
  })

  it('without readSource the source-line rules cannot apply, so the item is unclassified (safe default)', () => {
    const r = lib.combineCoverage({ primary: [primary()], secondary: [bddAt(50)] })
    expect(count(r, 'bdd-commonjs-emit')).toBe(0)
    expect(r.reconciliation.unclassified).toHaveLength(1)
  })
})

describe('class 2: e2e-vue-template-branch (REQ-001)', () => {
  const e2eBranch = (file: string, line: number) =>
    layer({ [file]: { branches: [{ type: 'cond-expr', line, arms: [1, 1] }] } })

  it('an e2e .vue branch with no slot inside <template> is counted under the class', () => {
    const r = combine([{}, e2eBranch(V, 50)])
    expect(count(r, 'e2e-vue-template-branch')).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([])
  })

  it('an e2e .vue branch on a <script> line is unclassified (script branches must not hide)', () => {
    const r = combine([{}, e2eBranch(V, 132)])
    expect(count(r, 'e2e-vue-template-branch')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 132, kind: 'branch', layer: 'e2e' }),
    ])
  })

  it('an e2e branch in a .ts file is unclassified', () => {
    const r = combine([{}, e2eBranch(A, 50)])
    expect(count(r, 'e2e-vue-template-branch')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'branch', layer: 'e2e' }),
    ])
  })

  it('a bdd branch on a .vue template line is unclassified (class 2 is e2e-only)', () => {
    const r = combine([e2eBranch(V, 50)])
    expect(count(r, 'e2e-vue-template-branch')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'branch', layer: 'bdd' }),
    ])
  })
})

describe('class 3: unalignable-branch-arm (REQ-001)', () => {
  const withArms = (layerArms: number[][], secondaryArms: number[]) => {
    const p = layer({
      [A]: { branches: [{ type: 'switch', line: 10, arms: layerArms[0] as number[] }] },
    })
    const s = layer({ [A]: { branches: [{ type: 'switch', line: 10, arms: secondaryArms }] } })
    return lib.combineCoverage({ primary: [p], secondary: [s], readSource: sources() })
  }

  it('a secondary branch whose arm count differs from its slot is counted under the class, in either secondary layer', () => {
    const r = withArms([[0, 0, 0]], [1, 1])
    expect(count(r, 'unalignable-branch-arm')).toBe(1)
    expect(r.reconciliation.classes['unalignable-branch-arm']?.byLayer.bdd).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([])

    const p = layer({ [A]: { branches: [{ type: 'switch', line: 10, arms: [0, 0, 0] }] } })
    const e = layer({ [A]: { branches: [{ type: 'switch', line: 10, arms: [1, 1] }] } })
    const r2 = lib.combineCoverage({ primary: [p], secondary: [{}, e], readSource: sources() })
    expect(r2.reconciliation.classes['unalignable-branch-arm']?.byLayer.e2e).toBe(1)
  })

  it('an if with a dropped else arm is credited, not classified', () => {
    const p = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [0, 0] }] } })
    const s = layer({ [A]: { branches: [{ type: 'if', line: 4, arms: [1] }] } })
    const r = lib.combineCoverage({ primary: [p], secondary: [s], readSource: sources() })
    expect(count(r, 'unalignable-branch-arm')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([])
    expect(r.totals.branches).toEqual({ covered: 1, total: 2 })
  })
})

describe('class 4: e2e-vue-template-expression (REQ-001, REQ-028 / C1)', () => {
  const e2eStmt = (file: string, line: number) =>
    layer({ [file]: { statements: [{ line, hits: 1 }] } })
  const e2eFn = (file: string, line: number) =>
    layer({ [file]: { functions: [{ line, hits: 1 }] } })

  it('an e2e .vue statement and function inside <template> are counted under the class', () => {
    const r = combine([{}, e2eStmt(V, 40)])
    expect(count(r, 'e2e-vue-template-expression')).toBe(1)
    const r2 = combine([{}, e2eFn(V, 40)])
    expect(count(r2, 'e2e-vue-template-expression')).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([])
    expect(r2.reconciliation.unclassified).toEqual([])
  })

  it('the same on a <script> line is unclassified', () => {
    for (const [mk, kind] of [
      [e2eStmt, 'statement'],
      [e2eFn, 'function'],
    ] as const) {
      const r = combine([{}, mk(V, 132)])
      expect(count(r, 'e2e-vue-template-expression')).toBe(0)
      expect(r.reconciliation.unclassified).toEqual([expect.objectContaining({ line: 132, kind })])
    }
  })

  it('the <template> / </template> tag lines themselves are not "strictly inside" and stay unclassified', () => {
    for (const line of [1, 130]) {
      const r = combine([{}, e2eStmt(V, line)])
      expect(count(r, 'e2e-vue-template-expression')).toBe(0)
      expect(r.reconciliation.unclassified).toHaveLength(1)
    }
  })

  it('the same in an e2e .ts file is unclassified', () => {
    const r = combine([{}, e2eStmt(A, 40)])
    expect(count(r, 'e2e-vue-template-expression')).toBe(0)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 40, kind: 'statement', layer: 'e2e' }),
    ])
  })

  it('the same in the bdd layer is unclassified', () => {
    for (const [mk, kind] of [
      [e2eStmt, 'statement'],
      [e2eFn, 'function'],
    ] as const) {
      const r = combine([mk(V, 40)])
      expect(count(r, 'e2e-vue-template-expression')).toBe(0)
      expect(r.reconciliation.unclassified).toEqual([
        expect.objectContaining({ line: 40, kind, layer: 'bdd' }),
      ])
    }
  })
})

describe('vueTemplateRange (advisory A1)', () => {
  it('uses the column-0 <template ... </template> pair, not the first "<template" substring', () => {
    const text = [
      '<script setup lang="ts">', // 1
      "const html = '<template>'", // 2
      'const y = 2', // 3
      '</script>', // 4
      '<template>', // 5
      '  <div />', // 6
      '</template>', // 7
    ].join('\n')
    const onLine = (line: number, kind: 'statements' | 'functions') =>
      layer({ [V]: { [kind]: [{ line, hits: 1 }] } })
    const unit = layer({ [V]: { statements: [{ line: 4, hits: 1 }] } })
    const run = (e2e: Record<string, unknown>) =>
      lib.combineCoverage({
        primary: [unit],
        secondary: [{}, e2e],
        readSource: () => text,
      })

    // script line 3 (after a '<template>' string on line 2) stays unclassified for both a statement and a function
    for (const [kind, k] of [
      ['statements', 'statement'],
      ['functions', 'function'],
    ] as const) {
      const r = run(onLine(3, kind))
      expect(count(r, 'e2e-vue-template-expression')).toBe(0)
      expect(r.reconciliation.unclassified).toEqual([expect.objectContaining({ line: 3, kind: k })])
    }
    // a real template line is classified
    const inside = run(onLine(6, 'statements'))
    expect(count(inside, 'e2e-vue-template-expression')).toBe(1)
  })

  it('a <script setup> block containing the string <template> after the real template does not extend or move the range', () => {
    const text = [
      '<template>', // 1
      '  <div />', // 2
      '</template>', // 3
      '<script setup lang="ts">', // 4
      "const html = '<template>'", // 5
      'const x = 1', // 6
      '</script>', // 7
    ].join('\n')
    const unit = layer({ [V]: { statements: [{ line: 6, hits: 1 }] } })
    const e2e = layer({
      [V]: {
        statements: [{ line: 5, hits: 1 }],
        functions: [{ line: 5, hits: 1 }],
      },
    })
    const r = lib.combineCoverage({ primary: [unit], secondary: [{}, e2e], readSource: () => text })
    expect(count(r, 'e2e-vue-template-expression')).toBe(0)
    expect(r.reconciliation.unclassified.map((u) => u.kind).sort()).toEqual([
      'function',
      'statement',
    ])
  })

  it('returns the 1-based start and end lines of the top-level template', () => {
    expect(lib.vueTemplateRange(vueText(10))).toEqual({ start: 1, end: 10 })
  })
})

describe('mixed classification (REQ-001, REQ-004, REQ-022)', () => {
  function mixed() {
    const unit = layer({
      [A]: {
        statements: [{ line: 1, hits: 1 }],
        branches: [{ type: 'switch', line: 10, arms: [0, 0, 0] }],
      },
      [V]: { statements: [{ line: 132, hits: 1 }] },
    })
    const bdd = layer({
      [A]: {
        statements: [
          { line: 1, hits: 1 },
          { line: 20, hits: 1 }, // import line: class 1
          { line: 50, hits: 1 }, // ordinary line: unclassified
        ],
        branches: [{ type: 'switch', line: 10, arms: [1, 1] }], // class 3
      },
    })
    const e2e = layer({
      [V]: {
        statements: [
          { line: 132, hits: 1 },
          { line: 3, hits: 1 }, // template: class 4
        ],
        branches: [{ type: 'cond-expr', line: 2, arms: [1, 1] }], // template: class 2
      },
    })
    const readSource = sources({ [A]: srcText({ 20: "import x from 'y'" }) })
    return { unit, bdd, e2e, readSource }
  }

  it('one item of each declared class plus one unclassified: count 1 each, unclassified 1, nothing dropped or double counted', () => {
    const { unit, bdd, e2e, readSource } = mixed()
    const r = lib.combineCoverage({ primary: [unit], secondary: [bdd, e2e], readSource })
    for (const id of CLASS_IDS) expect(count(r, id)).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 50, kind: 'statement', layer: 'bdd' }),
    ])
  })

  it('totals are identical with and without the secondary-only items', () => {
    const { unit, bdd, e2e, readSource } = mixed()
    const withSecondary = lib.combineCoverage({
      primary: [unit],
      secondary: [bdd, e2e],
      readSource,
    })
    const without = lib.combineCoverage({ primary: [unit], secondary: [], readSource })
    expect(withSecondary.totals.statements.total).toBe(without.totals.statements.total)
    expect(withSecondary.totals.branches.total).toBe(without.totals.branches.total)
    expect(withSecondary.totals.functions).toEqual(without.totals.functions)
    expect(withSecondary.reconciliation.unclassified).toHaveLength(1)
  })

  it('identical inputs give identical counts and unclassified list (deterministic)', () => {
    const { unit, bdd, e2e, readSource } = mixed()
    const a = lib.combineCoverage({ primary: [unit], secondary: [bdd, e2e], readSource })
    const b = lib.combineCoverage({ primary: [unit], secondary: [bdd, e2e], readSource })
    expect(a.reconciliation.classes).toBeDefined()
    expect(a.reconciliation).toEqual(b.reconciliation)
  })

  it('reversing the secondary layers together with their names gives identical counts and list', () => {
    const { unit, bdd, e2e, readSource } = mixed()
    const a = lib.combineCoverage({
      primary: [unit],
      secondary: [bdd, e2e],
      secondaryNames: ['bdd', 'e2e'],
      readSource,
    })
    const b = lib.combineCoverage({
      primary: [unit],
      secondary: [e2e, bdd],
      secondaryNames: ['e2e', 'bdd'],
      readSource,
    })
    expect(a.reconciliation.classes).toBeDefined()
    expect(b.reconciliation).toEqual(a.reconciliation)
    expect(b.totals).toEqual(a.totals)
  })

  it('reports unclassified items sorted by file, line, kind and layer', () => {
    const unit = primary()
    const bdd = layer({
      [A]: {
        statements: [
          { line: 80, hits: 1 },
          { line: 60, hits: 1 },
        ],
      },
      [B]: { statements: [{ line: 2, hits: 1 }] },
    })
    const e2e = layer({ [A]: { statements: [{ line: 60, hits: 1 }] } })
    const r = lib.combineCoverage({ primary: [unit], secondary: [bdd, e2e], readSource: sources() })
    expect(
      r.reconciliation.unclassified.map((u: { file: string; line: number; layer: string }) => [
        u.file.slice(-8),
        u.line,
        u.layer,
      ])
    ).toEqual([
      ['src/a.ts', 60, 'bdd'],
      ['src/a.ts', 60, 'e2e'],
      ['src/a.ts', 80, 'bdd'],
      ['src/b.ts', 2, 'bdd'],
    ])
  })

  it('items of a secondary-only file are classified individually, not dropped', () => {
    const bdd = layer({
      [B]: {
        statements: [
          { line: 1, hits: 1 },
          { line: 2, hits: 1 },
        ],
      },
    })
    const r = combine([bdd], sources({ [B]: srcText({ 1: "import z from 'z'" }) }))
    expect(count(r, 'bdd-commonjs-emit')).toBe(1)
    expect(r.reconciliation.unclassified).toEqual([
      expect.objectContaining({ line: 2, kind: 'statement', layer: 'bdd' }),
    ])
  })
})

describe('assertNoUnclassified (check 4, REQ-003)', () => {
  const empty: Reconciliation = { classes: {}, unclassified: [] }

  it('passes with zero unclassified items', () => {
    expect(() => lib.assertNoUnclassified(empty)).not.toThrow()
  })

  it('passes when only classified items exist', () => {
    const r = combine(
      [layer({ [A]: { statements: [{ line: 20, hits: 1 }] } })],
      sources({ [A]: srcText({ 20: "import x from 'y'" }) })
    )
    expect(count(r, 'bdd-commonjs-emit')).toBe(1)
    expect(() => lib.assertNoUnclassified(r.reconciliation)).not.toThrow()
  })

  it('fails with the count in the message and a pointer to the listed items', () => {
    const one: Reconciliation = {
      classes: {},
      unclassified: [{ file: A, line: 12, kind: 'statement', layer: 'bdd' }],
    }
    expect(() => lib.assertNoUnclassified(one)).toThrow(/\b1\b.*unclassified|unclassified.*\b1\b/is)
    expect(() => lib.assertNoUnclassified(one)).toThrow(/secondary-only item/i)
    const three: Reconciliation = {
      classes: {},
      unclassified: [1, 2, 3].map((line) => ({ file: A, line, kind: 'statement', layer: 'e2e' })),
    }
    expect(() => lib.assertNoUnclassified(three)).toThrow(/\b3\b/)
  })
})

describe('formatUnclassifiedLine and paths (REQ-002, REQ-029)', () => {
  it('formats file:line kind (layer)', () => {
    expect(
      lib.formatUnclassifiedLine({
        file: '/proj/src/x.ts',
        line: 12,
        kind: 'statement',
        layer: 'bdd',
      })
    ).toBe('Unclassified secondary-only item: src/x.ts:12 statement (bdd)')
  })

  it('backslash keys produce forward-slash output', () => {
    expect(
      lib.formatUnclassifiedLine({
        file: 'C:\\proj\\src\\sub\\x.vue',
        line: 3,
        kind: 'branch',
        layer: 'e2e',
      })
    ).toBe('Unclassified secondary-only item: src/sub/x.vue:3 branch (e2e)')
  })

  it('relativeSrcPath returns the src-relative forward-slash path', () => {
    expect(lib.relativeSrcPath('C:\\proj\\src\\a.ts')).toBe('src/a.ts')
    expect(lib.relativeSrcPath('/proj/src/sub/b.vue')).toBe('src/sub/b.vue')
    expect(lib.relativeSrcPath('C:/proj/src/a.ts')).toBe('src/a.ts')
  })
})

describe('scope: out-of-scope files are not reconciled (design D4)', () => {
  it('isExcluded matches the shared exclusion list', () => {
    expect(lib.isExcluded('src/main.ts')).toBe(true)
    expect(lib.isExcluded('src/components/A.stories.ts')).toBe(true)
    expect(lib.isExcluded('src/A.stories.ts')).toBe(true)
    expect(lib.isExcluded('src/composables/__mocks__/useX.ts')).toBe(true)
    expect(lib.isExcluded('src/a.ts')).toBe(false)
    expect(lib.isExcluded('src/components/A.vue')).toBe(false)
  })

  it('scopeToInScope drops excluded files from a layer and keeps in-scope ones', () => {
    const data = layer({
      [A]: { statements: [{ line: 1, hits: 1 }] },
      [MAIN]: { statements: [{ line: 4, hits: 1 }] },
      '/proj/src/X.stories.ts': { statements: [{ line: 1, hits: 1 }] },
      '/proj/src/__mocks__/m.ts': { statements: [{ line: 1, hits: 1 }] },
    })
    expect(Object.keys(lib.scopeToInScope(data))).toEqual([A])
  })

  it('an out-of-scope src/main.ts in a secondary layer is not reported as unclassified once scoped', () => {
    const e2e = lib.scopeToInScope(
      layer({
        [A]: { statements: [{ line: 1, hits: 1 }] },
        [MAIN]: { statements: [{ line: 4, hits: 1 }] },
      })
    )
    const r = lib.combineCoverage({
      primary: [primary()],
      secondary: [{}, e2e],
      readSource: sources(),
    })
    expect(r.reconciliation.unclassified).toEqual([])
  })
})
