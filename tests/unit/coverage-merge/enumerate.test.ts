import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// scripts/lib/enumerate-source.mjs (#215, REQ-020): zero-hit enumeration for a source file
// no test imports. Loaded dynamically so a missing module fails each test, not the file.
const modUrl = pathToFileURL(
  path.resolve(__dirname, '../../../scripts/lib/enumerate-source.mjs')
).href
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function load(): Promise<any> {
  return import(/* @vite-ignore */ modUrl)
}

const TS = [
  "import { x } from './x'", // 1
  'export interface Foo { a: number }', // 2
  'export type Bar = string', // 3
  'const a = 1', // 4
  'function f(n: number) {', // 5
  '  if (n > 1) {', // 6
  '    return a', // 7
  '  }', // 8
  '  return n ? 1 : 2', // 9
  '}', // 10
  'export const g = () => {', // 11
  '  a + 1', // 12
  '}', // 13
].join('\n')

const lines = (fc: { statementMap: Record<string, { start: { line: number } }> }) =>
  [...new Set(Object.values(fc.statementMap).map((l) => l.start.line))].sort((x, y) => x - y)

describe('enumerateZeroHitCoverage: .ts files', () => {
  it('returns an Istanbul-shaped entry for the file with every hit count at 0', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage('/proj/src/x.ts', TS)
    expect(fc.path).toBe('/proj/src/x.ts')
    expect(Object.keys(fc.statementMap).length).toBeGreaterThan(0)
    expect(Object.keys(fc.s).sort()).toEqual(Object.keys(fc.statementMap).sort())
    for (const h of Object.values(fc.s)) expect(h).toBe(0)
    for (const h of Object.values(fc.f)) expect(h).toBe(0)
    for (const arms of Object.values(fc.b) as number[][]) for (const h of arms) expect(h).toBe(0)
  })

  it('enumerates executable statements but not imports, interfaces, type aliases, function declarations or closing braces', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const found = lines(enumerateZeroHitCoverage('/proj/src/x.ts', TS))
    for (const want of [4, 6, 7, 9, 12]) expect(found).toContain(want)
    for (const not of [1, 2, 3, 5, 8, 10, 13]) expect(found).not.toContain(not)
  })

  it('enumerates functions (declaration and arrow) and branches (if and conditional, two arms each)', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage('/proj/src/x.ts', TS)
    expect(Object.keys(fc.fnMap)).toHaveLength(2)
    expect(Object.keys(fc.f)).toHaveLength(2)
    const arms = Object.values(fc.b) as number[][]
    expect(arms).toHaveLength(2)
    for (const a of arms) expect(a).toHaveLength(2)
    expect(Object.keys(fc.branchMap)).toHaveLength(2)
  })

  it('a types-only file yields an empty entry and does not throw', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage(
      '/proj/src/types.ts',
      'export interface A { x: number }\nexport type B = string\n'
    )
    expect(fc.statementMap).toEqual({})
    expect(fc.fnMap).toEqual({})
    expect(fc.branchMap).toEqual({})
    expect(fc.s).toEqual({})
  })

  it('a syntax error throws an Error naming the file', async () => {
    const { enumerateZeroHitCoverage } = await load()
    expect(() => enumerateZeroHitCoverage('/proj/src/bad.ts', 'const = ;')).toThrow(/bad\.ts/)
  })
})

describe('enumerateZeroHitCoverage: .vue files', () => {
  const VUE = [
    '<template>', // 1
    '  <div>{{ msg }}</div>', // 2
    '</template>', // 3
    '<script lang="ts">', // 4
    'const plain = 1', // 5
    '</script>', // 6
    '<script setup lang="ts">', // 7
    "const msg = 'hi'", // 8
    'function go() {', // 9
    '  return msg', // 10
    '}', // 11
    '</script>', // 12
  ].join('\n')

  it('enumerates <script> and <script setup> statements at their absolute line numbers, and nothing from the template', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage('/proj/src/A.vue', VUE)
    expect(lines(fc)).toEqual([5, 8, 10])
    for (const h of Object.values(fc.s)) expect(h).toBe(0)
  })

  it('enumerates functions declared in the script blocks', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage('/proj/src/A.vue', VUE)
    expect(Object.keys(fc.fnMap)).toHaveLength(1)
  })

  it('a template-only component yields an empty entry', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const fc = enumerateZeroHitCoverage('/proj/src/T.vue', '<template>\n  <div />\n</template>\n')
    expect(fc.statementMap).toEqual({})
  })

  it('a syntax error in the script throws naming the file', async () => {
    const { enumerateZeroHitCoverage } = await load()
    const bad = '<script setup lang="ts">\nconst = ;\n</script>\n'
    expect(() => enumerateZeroHitCoverage('/proj/src/Bad.vue', bad)).toThrow(/Bad\.vue/)
  })
})

describe('countFunctionsAndBranches', () => {
  it('counts the functions and branch constructs of a source file', async () => {
    const { countFunctionsAndBranches } = await load()
    const c = countFunctionsAndBranches('/proj/src/x.ts', TS)
    expect(c.functions).toBe(2)
    expect(c.branches).toBeGreaterThan(0)
  })

  it('reports zero for a types-only file', async () => {
    const { countFunctionsAndBranches } = await load()
    expect(countFunctionsAndBranches('/proj/src/t.ts', 'export type B = string\n')).toMatchObject({
      functions: 0,
      branches: 0,
    })
  })
})
