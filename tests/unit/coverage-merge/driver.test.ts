import { describe, it, expect, afterAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { A_SRC, CAL_SRC, goodLayers, mkFile } from './fixtures'

// Process-level contract of scripts/merge-coverage.mjs --analyze-only (#215): exit codes,
// the last two lines, no Combined lines on failure. Each case builds a small fixture
// project (src/ with a calibration-marker file, four coverage-final.json files).
// No layer command is ever run: --analyze-only analyses an existing coverage/ directory.

const script = path.resolve(__dirname, '../../../scripts/merge-coverage.mjs')
const tmpRoots: string[] = []
afterAll(() => {
  for (const d of tmpRoots) fs.rmSync(d, { recursive: true, force: true })
})

type Layers = ReturnType<typeof goodLayers>

function makeProject(mutate?: (layers: Layers, a: string, cal: string) => void, skip?: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covdriver-'))
  tmpRoots.push(dir)
  const base = dir.split(path.sep).join('/')
  const a = `${base}/src/a.ts`
  const cal = `${base}/src/cal.ts`
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'src/a.ts'), A_SRC)
  fs.writeFileSync(path.join(dir, 'src/cal.ts'), CAL_SRC)
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, '.claude/STANDARDS.md'),
    '# Standards\n\n**Coverage method version:** `v3` - fixture\n'
  )
  // goodLayers keys are relative to the fake root; rebuild with the real paths.
  const layers = goodLayers(a, cal)
  mutate?.(layers, a, cal)
  for (const [name, data] of Object.entries(layers)) {
    if (name === skip) continue
    fs.mkdirSync(path.join(dir, 'coverage', name), { recursive: true })
    fs.writeFileSync(path.join(dir, 'coverage', name, 'coverage-final.json'), JSON.stringify(data))
  }
  return { dir, a, cal }
}

function run(dir: string) {
  const r = spawnSync(process.execPath, [script, '--analyze-only'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 30_000,
  })
  const stdout = r.stdout ?? ''
  const stderr = r.stderr ?? ''
  return {
    status: r.status,
    stdout,
    stderr,
    lines: stdout.split(/\r?\n/).filter((l) => l.trim() !== ''),
  }
}

describe('merge-coverage.mjs --analyze-only', () => {
  it('(a) a good fixture exits 0, ends with the two contract lines in order, and runs no layer command', () => {
    const { dir } = makeProject()
    const out = run(dir)
    expect(out.status, out.stderr).toBe(0)
    expect(out.lines.slice(-2)).toEqual([
      'Combined coverage: 66.67% (4/6 statements)',
      'Combined branch coverage: 100.00% (2/2 branches)',
    ])
    expect(out.lines.filter((l) => l.startsWith('Combined'))).toHaveLength(2)
    // REQ-030: the layer inputs were analysed in place, not cleaned or regenerated.
    for (const name of ['unit', 'storybook', 'bdd', 'e2e']) {
      expect(fs.existsSync(path.join(dir, 'coverage', name, 'coverage-final.json'))).toBe(true)
    }
    expect(fs.existsSync(path.join(dir, '.nyc_output'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'coverage/merged/coverage-final.json'))).toBe(true)
  })

  it('(a) prints the per-layer lines, reconciliation lines and check lines before the contract lines, in that order', () => {
    const out = run(makeProject().dir)
    const idx = (re: RegExp) => out.lines.findIndex((l) => re.test(l))
    const lastIdx = (re: RegExp) => out.lines.map((l) => re.test(l)).lastIndexOf(true)
    expect(out.lines.filter((l) => l.startsWith('Coverage layer:'))).toHaveLength(4)
    expect(lastIdx(/^Coverage layer:/)).toBeLessThan(idx(/^Coverage reconciliation:/))
    expect(lastIdx(/^Coverage reconciliation:/)).toBeLessThan(idx(/^Coverage check/))
    expect(lastIdx(/^Coverage check/)).toBeLessThan(out.lines.length - 2)
    for (const id of [
      'bdd-commonjs-emit',
      'e2e-vue-template-branch',
      'e2e-vue-template-expression',
      'unalignable-branch-arm',
    ]) {
      expect(out.lines).toContain(`Coverage reconciliation: class ${id}: 0`)
    }
    const checks = out.lines.filter((l) => l.startsWith('Coverage check'))
    expect(checks.length).toBeGreaterThanOrEqual(7)
    for (const c of checks) expect(c).not.toMatch(/FAILED/)
  })

  it('(f) prints equal on-disk and inventory file counts on the good fixture', () => {
    const out = run(makeProject().dir)
    const disk = out.lines.find((l) => /^Coverage reconciliation:.*on disk/i.test(l)) as string
    const inv = out.lines.find((l) => /^Coverage reconciliation:.*inventory/i.test(l)) as string
    expect(Number(/on disk\D*(\d+)/i.exec(disk)?.[1])).toBe(2)
    expect(Number(/inventory\D*(\d+)/i.exec(inv)?.[1])).toBe(2)
  })

  it('(b) one unclassified item exits non-zero, names the count on stderr, lists the item, and prints no Combined line', () => {
    const { dir } = makeProject((layers, a) => {
      layers.bdd[a] = mkFile(a, {
        statements: [1, 2, 3, 4, 6, 99].map((line) => ({ line, hits: 1 })),
      })
    })
    const out = run(dir)
    expect(out.status).not.toBe(0)
    expect(out.stderr).toMatch(/\b1\b[^\n]*unclassified|unclassified[^\n]*\b1\b/i)
    expect(out.stdout).toContain('Unclassified secondary-only item: src/a.ts:99 statement (bdd)')
    expect(out.lines.some((l) => l.startsWith('Combined'))).toBe(false)
    expect(out.lines.some((l) => /^Coverage check 4\b.*FAILED/.test(l))).toBe(true)
  })

  it('(c) a calibration statement hit by the e2e layer exits non-zero, names the layer, and prints no Combined line', () => {
    const { dir } = makeProject((layers, _a, cal) => {
      layers.e2e[cal] = mkFile(cal, {
        statements: [{ line: 2, hits: 5 }],
        functions: [{ line: 1, hits: 0 }],
      })
    })
    const out = run(dir)
    expect(out.status).not.toBe(0)
    expect(out.stderr).toMatch(/e2e/)
    expect(out.stderr).toMatch(/calibration/i)
    expect(out.lines.some((l) => l.startsWith('Combined'))).toBe(false)
  })

  it('(d) a run where only signals fire still exits 0 and prints the Coverage signal line', () => {
    const { dir } = makeProject((layers, a) => {
      layers.bdd[a] = mkFile(a, {
        statements: [1, 2, 3, 4, 6].map((line) => ({ line, hits: 1 })),
        branches: [{ type: 'if', line: 3, arms: [0, 1] }],
        functions: [{ line: 1, hits: 1 }],
      })
    })
    const out = run(dir)
    expect(out.status, out.stderr).toBe(0)
    expect(out.lines.some((l) => /^Coverage signal: uniform-hit-counts layer=bdd /.test(l))).toBe(
      true
    )
    expect(out.lines.slice(-2)[0]).toMatch(/^Combined coverage: /)
  })

  it('(e) a missing e2e coverage-final.json exits non-zero, names the layer, and prints no Combined line', () => {
    const { dir } = makeProject(undefined, 'e2e')
    const out = run(dir)
    expect(out.status).not.toBe(0)
    expect(out.stderr).toMatch(/e2e/)
    expect(out.lines.some((l) => l.startsWith('Combined'))).toBe(false)
  })

  it('an unparseable layer file exits non-zero naming the layer', () => {
    const { dir } = makeProject()
    fs.writeFileSync(path.join(dir, 'coverage/bdd/coverage-final.json'), '{ nope')
    const out = run(dir)
    expect(out.status).not.toBe(0)
    expect(out.stderr).toMatch(/bdd/)
    expect(out.lines.some((l) => l.startsWith('Combined'))).toBe(false)
  })

  it('a source file on disk that no layer reports is inserted at 0 hits rather than failing check 3', () => {
    const { dir } = makeProject()
    fs.writeFileSync(path.join(dir, 'src/untested.ts'), 'const u = 1\nconst w = 2\n')
    const out = run(dir)
    expect(out.status, out.stderr).toBe(0)
    // 4 covered of 8: the two untested statements are in the denominator
    expect(out.lines.slice(-2)[0]).toBe('Combined coverage: 50.00% (4/8 statements)')
  })
})
