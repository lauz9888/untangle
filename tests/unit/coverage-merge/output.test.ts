import { describe, it, expect } from 'vitest'
import * as lib from '../../../scripts/lib/coverage-merge.mjs'
import { A_SRC, CAL_SRC, goodLayers, mkFile, recount } from './fixtures'

// Output contract and reconciliation summary (#215, REQ-005, 006, 015, 016, 029).

const A = '/proj/src/a.ts'
const CAL = '/proj/src/cal.ts'
const CLASS_IDS = [
  'bdd-commonjs-emit',
  'e2e-vue-template-branch',
  'e2e-vue-template-expression',
  'unalignable-branch-arm',
]

const totals = (s: [number, number], b: [number, number]) => ({
  statements: { covered: s[0], total: s[1] },
  branches: { covered: b[0], total: b[1] },
  functions: { covered: 0, total: 0 },
})

describe('formatCombinedLines (REQ-015)', () => {
  it('returns exactly the two contract lines, statements first then branches', () => {
    expect(lib.formatCombinedLines(totals([903, 929], [722, 752]))).toEqual([
      'Combined coverage: 97.20% (903/929 statements)',
      'Combined branch coverage: 96.01% (722/752 branches)',
    ])
  })

  it('matches the contract regexes and always prints two decimals', () => {
    const [stmt, branch] = lib.formatCombinedLines(totals([1, 3], [2, 2]))
    expect(stmt).toMatch(/^Combined coverage: \d+\.\d{2}% \(\d+\/\d+ statements\)$/)
    expect(branch).toMatch(/^Combined branch coverage: \d+\.\d{2}% \(\d+\/\d+ branches\)$/)
    expect(stmt).toBe('Combined coverage: 33.33% (1/3 statements)')
    expect(branch).toBe('Combined branch coverage: 100.00% (2/2 branches)')
  })

  it('throws instead of printing a 0/0 statement total', () => {
    expect(() => lib.formatCombinedLines(totals([0, 0], [1, 2]))).toThrow(/zero|0\/0|total/i)
  })

  it('throws instead of printing a 0/0 branch total', () => {
    expect(() => lib.formatCombinedLines(totals([1, 2], [0, 0]))).toThrow(/zero|0\/0|total/i)
  })
})

describe('buildLayerSummaryLines (REQ-006)', () => {
  it('prints one Coverage layer line per layer with statements and branches covered/total', () => {
    const layers = goodLayers(A, CAL)
    const lines: string[] = lib.buildLayerSummaryLines(layers)
    expect(lines).toHaveLength(4)
    for (const name of ['unit', 'storybook', 'bdd', 'e2e'] as const) {
      const line = lines.find((l) => l.includes(name)) as string
      expect(line, name).toBeDefined()
      expect(line.startsWith('Coverage layer:')).toBe(true)
      const want = recount(layers[name])
      const s = /statements\D+(\d+)\/(\d+)/.exec(line)
      const b = /branches\D+(\d+)\/(\d+)/.exec(line)
      expect([Number(s?.[1]), Number(s?.[2])]).toEqual([
        want.statements.covered,
        want.statements.total,
      ])
      expect([Number(b?.[1]), Number(b?.[2])]).toEqual([want.branches.covered, want.branches.total])
    }
  })
})

describe('buildReconciliationSummary (REQ-005, REQ-006)', () => {
  const reconciliation = {
    classes: {
      'bdd-commonjs-emit': { total: 25, byLayer: { bdd: 25, e2e: 0 } },
      'e2e-vue-template-branch': { total: 40, byLayer: { bdd: 0, e2e: 40 } },
      'e2e-vue-template-expression': { total: 0, byLayer: { bdd: 0, e2e: 0 } },
      'unalignable-branch-arm': { total: 2, byLayer: { bdd: 0, e2e: 2 } },
    },
    unclassified: [{ file: A, line: 12, kind: 'statement', layer: 'bdd' }],
  }
  const build = () =>
    lib.buildReconciliationSummary(reconciliation, {
      diskFileCount: 66,
      inventoryFileCount: 65,
    }) as string[]

  it('prints one "Coverage reconciliation: class <id>: <n>" line per declared class, including zero', () => {
    const lines = build()
    for (const [id, n] of [
      ['bdd-commonjs-emit', 25],
      ['e2e-vue-template-branch', 40],
      ['e2e-vue-template-expression', 0],
      ['unalignable-branch-arm', 2],
    ] as const) {
      expect(lines).toContain(`Coverage reconciliation: class ${id}: ${n}`)
    }
    expect(CLASS_IDS.every((id) => lines.some((l) => l.includes(`class ${id}:`)))).toBe(true)
  })

  it('prints the unclassified count and both file counts as labelled lines', () => {
    const lines = build()
    const get = (re: RegExp) =>
      lines.find((l) => l.startsWith('Coverage reconciliation:') && re.test(l))
    expect(get(/unclassified\D*1\b/i), 'unclassified count').toBeDefined()
    expect(get(/on disk\D*66\b/i), 'on-disk count').toBeDefined()
    expect(get(/inventory\D*65\b/i), 'inventory count').toBeDefined()
  })

  it('prints a zero unclassified count too', () => {
    const lines = lib.buildReconciliationSummary(
      { ...reconciliation, unclassified: [] },
      { diskFileCount: 2, inventoryFileCount: 2 }
    ) as string[]
    expect(lines.some((l) => /unclassified\D*0\b/i.test(l))).toBe(true)
  })
})

describe('analyzeCoverage output (REQ-006, REQ-015)', () => {
  const sources: Record<string, string> = { [A]: A_SRC, [CAL]: CAL_SRC }
  const analyze = (layers = goodLayers(A, CAL)) =>
    lib.analyzeCoverage({
      layers,
      diskFiles: [A, CAL],
      readSource: (f: string) => sources[f] as string,
      enumerate: (f: string) => ({
        ...mkFile(f, {}),
        functions: 1,
        branches: f === A ? 1 : 0,
      }),
      baseline: null,
    })

  it('the last two lines are the contract lines, preceded by the per-layer lines then the reconciliation summary', () => {
    const out = analyze()
    const lines: string[] = out.lines
    expect(lines.at(-2)).toMatch(/^Combined coverage: \d+\.\d{2}% \(\d+\/\d+ statements\)$/)
    expect(lines.at(-1)).toMatch(/^Combined branch coverage: \d+\.\d{2}% \(\d+\/\d+ branches\)$/)
    expect(lines.filter((l) => l.startsWith('Combined'))).toHaveLength(2)
    const firstLayer = lines.findIndex((l) => l.startsWith('Coverage layer:'))
    const lastLayer = lines.map((l) => l.startsWith('Coverage layer:')).lastIndexOf(true)
    const firstRecon = lines.findIndex((l) => l.startsWith('Coverage reconciliation:'))
    expect(firstLayer).toBeGreaterThanOrEqual(0)
    expect(lastLayer).toBeLessThan(firstRecon)
    expect(firstRecon).toBeLessThan(lines.length - 2)
  })

  it('reports equal on-disk and inventory file counts on a clean run', () => {
    const lines: string[] = analyze().lines
    const disk = lines.find((l) => /^Coverage reconciliation:.*on disk/i.test(l)) as string
    const inv = lines.find((l) => /^Coverage reconciliation:.*inventory/i.test(l)) as string
    expect(Number(/on disk\D*(\d+)/i.exec(disk)?.[1])).toBe(2)
    expect(Number(/inventory\D*(\d+)/i.exec(inv)?.[1])).toBe(2)
  })
})
