import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as lib from '../../../scripts/lib/coverage-merge.mjs'
import { layer } from './fixtures'

// The calibration statement (#215, REQ-008, 009, 010, 019). Real-tree guards plus the
// marker lookup. This file builds the function name by concatenation so its own source
// never contains the literal (the reference scan excludes tests/unit/coverage-merge/).

const root = path.resolve(__dirname, '../../..')
const MARKER = 'coverage-calibration-statement'
const FN_NAME = 'coverageCalibration' + 'Unreachable'

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'coverage') continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (/\.(ts|vue|js|mjs|feature)$/.test(e.name)) out.push(full)
  }
  return out
}
const posix = (p: string) => p.split(path.sep).join('/')

const srcFiles = () =>
  walk(path.join(root, 'src')).map((f) => ({ path: posix(f), text: fs.readFileSync(f, 'utf8') }))

describe('CALIBRATION_MARKER and findCalibrationSites', () => {
  it('the exported marker is the stable token', () => {
    expect(lib.CALIBRATION_MARKER).toBe(MARKER)
  })

  it('returns each file and 1-based line where the marker occurs', () => {
    const files = [
      { path: '/proj/src/a.ts', text: 'const a = 1\nconst b = 2' },
      { path: '/proj/src/cal.ts', text: `function f() {\n  return 0 // ${MARKER}\n}` },
    ]
    expect(lib.findCalibrationSites(files)).toEqual([{ file: '/proj/src/cal.ts', line: 2 }])
  })

  it('returns one site per occurrence (so two markers can be rejected)', () => {
    const files = [
      { path: '/proj/src/a.ts', text: `return 1 // ${MARKER}` },
      { path: '/proj/src/b.ts', text: `\n\nreturn 2 // ${MARKER}` },
    ]
    expect(lib.findCalibrationSites(files)).toEqual([
      { file: '/proj/src/a.ts', line: 1 },
      { file: '/proj/src/b.ts', line: 3 },
    ])
  })

  it('returns no site when the marker is absent', () => {
    expect(lib.findCalibrationSites([{ path: '/proj/src/a.ts', text: 'return 0' }])).toEqual([])
  })
})

describe('relocating the calibration statement (REQ-010)', () => {
  const FILE = '/proj/src/cal.ts'
  const body = (pad: number) =>
    `${'// filler\n'.repeat(pad)}export function f() {\n  return 0 // ${MARKER}\n}`
  const zeroLayer = (line: number) =>
    layer({ [FILE]: { statements: [{ line, hits: 0 }], functions: [{ line: line - 1, hits: 0 }] } })
  const run = (pad: number) => {
    const sites = lib.findCalibrationSites([{ path: FILE, text: body(pad) }])
    const line = pad + 2
    const l = zeroLayer(line)
    const inventory = lib.combineCoverage({ primary: [l, l], secondary: [l, l] }).data
    return {
      sites,
      check: () =>
        lib.checkCalibration({
          layers: { unit: l, storybook: l, bdd: l, e2e: l },
          inventory,
          sites,
        }),
    }
  }

  it('the same source with the marker moved 10 lines is found and still passes, with no edit to the check', () => {
    const at0 = run(0)
    const at10 = run(10)
    expect(at0.sites[0].line).toBe(2)
    expect(at10.sites[0].line).toBe(12)
    expect(at0.check).not.toThrow()
    expect(at10.check).not.toThrow()
  })

  it('a fixture with two markers fails, as does one with none', () => {
    const l = layer({ [FILE]: { statements: [{ line: 2, hits: 0 }] } })
    const layers = { unit: l, storybook: l, bdd: l, e2e: l }
    const inventory = lib.combineCoverage({ primary: [l], secondary: [] }).data
    const two = lib.findCalibrationSites([
      { path: FILE, text: `a\nb // ${MARKER}\nc // ${MARKER}` },
    ])
    expect(two).toHaveLength(2)
    expect(() => lib.checkCalibration({ layers, inventory, sites: two })).toThrow(
      /marker|site|exactly one|two|more than|multiple/i
    )
    expect(() => lib.checkCalibration({ layers, inventory, sites: [] })).toThrow(
      /marker|site|exactly one|zero|none/i
    )
  })
})

describe('the real source tree (REQ-008, D1 drift guard)', () => {
  it('has the marker exactly once under src/', () => {
    const sites = lib.findCalibrationSites(srcFiles())
    expect(sites).toHaveLength(1)
    expect(sites[0].file).toMatch(/src\/composables\/useBoardOrdering\.ts$/)
  })

  it('the marker line is a return statement the enumerator models, and the statement is in a function that exists', async () => {
    const [site] = lib.findCalibrationSites(srcFiles())
    expect(site, 'a calibration site exists').toBeDefined()
    const text = fs.readFileSync(site.file, 'utf8')
    expect(text.split(/\r?\n/)[site.line - 1]).toMatch(/\breturn\b/)
    const mod = await import(
      /* @vite-ignore */ pathToFileURL(path.join(root, 'scripts/lib/enumerate-source.mjs')).href
    )
    const fc = mod.enumerateZeroHitCoverage(site.file, text)
    const startLines = Object.values(fc.statementMap).map(
      (l) => (l as { start: { line: number } }).start.line
    )
    expect(startLines).toContain(site.line)
  })

  it('the calibration function is defined once and referenced nowhere else (src, tests, features, .storybook)', () => {
    const dirs = ['src', 'tests', 'features', '.storybook'].map((d) => path.join(root, d))
    const excluded = posix(path.join(root, 'tests/unit/coverage-merge')) + '/'
    const hits: { file: string; line: string }[] = []
    for (const dir of dirs) {
      for (const f of walk(dir)) {
        const p = posix(f)
        if (p.startsWith(excluded)) continue
        for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
          if (line.includes(FN_NAME)) hits.push({ file: p, line })
        }
      }
    }
    const definitions = hits.filter((h) =>
      new RegExp(`^\\s*export function ${FN_NAME}\\b`).test(h.line)
    )
    expect(definitions).toHaveLength(1)
    expect(hits.filter((h) => !definitions.includes(h))).toEqual([])
  })
})
