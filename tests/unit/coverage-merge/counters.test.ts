import { describe, it, expect } from 'vitest'
import { addCounters } from '../../e2e/coverage-counters'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cov = Record<string, any>

function file(s: number[], f: number[], b: number[][]): Cov {
  const toObj = (arr: unknown[]) => Object.fromEntries(arr.map((v, i) => [String(i), v]))
  return {
    path: '/x',
    statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
    fnMap: {},
    branchMap: {},
    s: toObj(s),
    f: toObj(f),
    b: toObj(b),
  }
}

describe('addCounters', () => {
  it('U28: sums s/f/b element-wise for matching paths', () => {
    const current = { '/a': file([1, 0, 2], [1], [[1, 0]]) }
    const prev = { '/a': { s: { '0': 2, '1': 3, '2': 0 }, f: { '0': 4 }, b: { '0': [0, 5] } } }
    const out = addCounters(current, prev) as Cov
    expect(out['/a'].s).toEqual({ '0': 3, '1': 3, '2': 2 })
    expect(out['/a'].f).toEqual({ '0': 5 })
    expect(out['/a'].b).toEqual({ '0': [1, 5] })
    expect(out['/a'].statementMap).toEqual(current['/a'].statementMap)
  })

  it('U29: paths only in prev are ignored and current is not mutated', () => {
    const current = { '/a': file([1], [1], [[1, 1]]) }
    const snapshot = structuredClone(current)
    const prev = {
      '/a': { s: { '0': 1 }, f: { '0': 1 }, b: { '0': [1, 1] } },
      '/gone': { s: { '0': 9 }, f: {}, b: {} },
    }
    const out = addCounters(current, prev) as Cov
    expect(Object.keys(out)).toEqual(['/a'])
    expect(current).toEqual(snapshot)
  })

  it('U30: prev === null returns current unchanged', () => {
    const current = { '/a': file([1, 2], [3], [[0, 1]]) }
    expect(addCounters(current, null)).toEqual(current)
  })

  it('applying two prev flushes in either order gives identical results', () => {
    const current = { '/a': file([1, 0], [1], [[1, 0]]) }
    const p1 = { '/a': { s: { '0': 2, '1': 1 }, f: { '0': 1 }, b: { '0': [1, 1] } } }
    const p2 = { '/a': { s: { '0': 0, '1': 4 }, f: { '0': 2 }, b: { '0': [0, 3] } } }
    const ab = addCounters(addCounters(current, p1), p2)
    const ba = addCounters(addCounters(current, p2), p1)
    expect(ab).toEqual(ba)
  })
})
