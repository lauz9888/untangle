// Coverage-merge pipeline for `npm run test:coverage:merge`. Runs four test
// layers and combines them into one accurate statement and branch coverage
// figure (method `v3`, see docs/adr/0009-coverage-method-v3-calibration-and-class-reconciliation.md
// and the "Coverage measurement" section of `.claude/STANDARDS.md`):
//   - unit: Vitest native v8 coverage (AST-based in Vitest 4)
//   - storybook: stories/interaction tests under @storybook/addon-vitest (also
//     v8, via vitest.storybook.config.ts)
//   - bdd: Cucumber under nyc/ts-node Istanbul instrumentation
//   - e2e: Playwright against a `vite-plugin-istanbul`-instrumented build
//     (COVERAGE=true), counters read from window.__coverage__ and remapped to
//     source coordinates with istanbul-lib-source-maps in
//     tests/e2e/global-teardown.ts
// The layers place the same statement/branch at different locations, so raw
// maps are NOT merged (that double counts). Instead scripts/lib/coverage-merge.mjs
// builds one statement/branch/function universe from unit + Storybook (plus a zero-hit
// entry for any in-scope file on disk no layer reports) and credits BDD/e2e hits onto
// slots that already exist in it. Every secondary-only item is classified into a declared
// artefact class or reported as unclassified.
//
// All post-run analysis lives in analyzeCoverage() (scripts/lib/coverage-merge.mjs). This
// driver only runs the layers, calls it, prints and exits. Output order:
//   1. `Coverage layer:` lines (per-layer statement and branch counts)
//   2. `Coverage reconciliation:` lines (per-class counts, unclassified count, file counts)
//      and any `Unclassified secondary-only item:` lines
//   3. `Coverage check N: ok|FAILED - ...` lines (eight validity checks; any failure exits
//      non-zero and prints no `Combined` line)
//   4. `Coverage signal:` lines (advisory; never change the exit code)
//   5. the istanbul text-summary
//   6. the final two lines, the output contract parsed by CI and `qa-reviewer`:
//      `Combined coverage: ...` (statements), then `Combined branch coverage: ...`
//
// `--analyze-only` skips the four layer runs and the clean-up and analyses the existing
// `coverage/` directory (used by the unit tests to prove the process-level contract).
// Note why `.nyc_output/` must be reset between the BDD and e2e phases below.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import istanbulLibCoverage from 'istanbul-lib-coverage'
import istanbulLibReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import {
  analyzeCoverage,
  isExcluded,
  loadLayers,
  parseBaselineFromReport,
  relativeSrcPath,
} from './lib/coverage-merge.mjs'
import { countFunctionsAndBranches, enumerateZeroHitCoverage } from './lib/enumerate-source.mjs'

const { createCoverageMap } = istanbulLibCoverage
const { createContext } = istanbulLibReport

const root = process.cwd()
const coverageDir = path.join(root, 'coverage')
const nycOutputDir = path.join(root, '.nyc_output')
const analyzeOnly = process.argv.includes('--analyze-only')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    ...options,
  })

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`)
  }
}

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true })
}

// Recursive walk of src/ for the on-disk universe (*.ts and *.vue minus the
// UNIVERSE_EXCLUDES mirror of vite.config.ts's test.coverage.exclude).
function listSourceFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listSourceFiles(full))
    else if (/\.(ts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

// The movement signal's baseline: the newest committed report whose `coverage_method`
// equals the current method version in `.claude/STANDARDS.md`. None when there is no such
// report (for example on the first run of a new method version).
function findBaseline() {
  try {
    const standards = fs.readFileSync(path.join(root, '.claude', 'STANDARDS.md'), 'utf8')
    const current = /\*\*Coverage method version:\*\*\s*`(v\d+)`/.exec(standards)?.[1]
    if (!current) return null
    const dir = path.join(root, 'reports')
    const names = fs
      .readdirSync(dir)
      .filter((n) => n.endsWith('.md'))
      .sort()
      .reverse()
    for (const name of names) {
      const baseline = parseBaselineFromReport(fs.readFileSync(path.join(dir, name), 'utf8'))
      if (baseline && baseline.method === current) return baseline
    }
  } catch {
    // No STANDARDS.md or reports/ directory: no baseline, no movement signal.
  }
  return null
}

function main() {
  if (!analyzeOnly) {
    // 1. Clean stale output.
    rm(coverageDir)
    rm(nycOutputDir)

    // 2. Unit tests with coverage (writes coverage/unit/coverage-final.json per
    // vite.config.ts's `test.coverage` block).
    run('npx', ['vitest', 'run', '--coverage'])

    // 2b. Storybook stories/interaction tests with coverage (writes
    // coverage/storybook/coverage-final.json per vitest.storybook.config.ts's
    // `test.coverage` block). Runs before the BDD/nyc step below since it
    // never touches .nyc_output/ — order relative to BDD/e2e doesn't matter,
    // grouped here next to the unit step because both are Vitest runs.
    run('npx', ['vitest', 'run', '--config', 'vitest.storybook.config.ts', '--coverage'])

    // 3. BDD tests under Istanbul instrumentation (nyc's require-hook
    // instruments src/**/*.ts as Cucumber's Node process requires it via
    // ts-node/register). Writes coverage/bdd/coverage-final.json.
    run('npx', ['nyc', '--reporter=json', '--report-dir=coverage/bdd', 'cucumber-js'])

    // 4. Reset .nyc_output/ again, immediately after step 3 and before step 5 —
    // nyc's own raw per-process dump from the BDD run is still sitting in
    // .nyc_output/ and must not bleed into the e2e-only merge below.
    rm(nycOutputDir)

    // 5. e2e tests with browser coverage collection (COVERAGE=true makes
    // vite.config.ts Istanbul-instrument the build and tells coverage-fixture.ts to
    // collect per-test window.__coverage__ counters into .nyc_output/, which global-teardown.ts
    // merges into coverage/e2e/coverage-final.json before deleting
    // .nyc_output/ again).
    run('npx', ['playwright', 'test'], { env: { ...process.env, COVERAGE: 'true' } })

    rm(nycOutputDir)
  }

  // 6. Load all four layers (a missing or unparseable layer file throws), then analyse.
  const layers = loadLayers(coverageDir)
  const readSource = (file) => fs.readFileSync(path.join(root, relativeSrcPath(file)), 'utf8')
  const diskFiles = listSourceFiles(path.join(root, 'src'))
    .map((f) => f.split(path.win32.sep).join(path.posix.sep))
    .filter((f) => !isExcluded(relativeSrcPath(f)))

  const analysis = analyzeCoverage({
    layers,
    diskFiles,
    readSource,
    enumerate: (file, text) => ({
      ...enumerateZeroHitCoverage(file, text),
      ...countFunctionsAndBranches(file, text),
    }),
    baseline: findBaseline(),
  })

  const map = createCoverageMap(analysis.result.data)
  const mergedDir = path.join(coverageDir, 'merged')
  fs.mkdirSync(mergedDir, { recursive: true })
  fs.writeFileSync(path.join(mergedDir, 'coverage-final.json'), JSON.stringify(map.toJSON()))

  if (analysis.failed) {
    for (const line of analysis.lines) console.log(line)
    const failures = analysis.checks.filter((c) => !c.ok)
    console.error(
      `${failures.length} coverage validity check(s) failed; no combined figure was printed:`
    )
    for (const c of failures) console.error(`  Coverage check ${c.id} (${c.name}): ${c.message}`)
    process.exitCode = 1
    return
  }

  // 7. Everything before the contract lines, the text-summary, then the two contract
  // lines last (parsed by qa-reviewer at pipeline Step 12, and by CI's coverage-merge job).
  for (const line of analysis.lines.slice(0, -2)) console.log(line)
  const context = createContext({ dir: mergedDir, coverageMap: map })
  reports.create('text-summary', {}).execute(context)
  for (const line of analysis.lines.slice(-2)) console.log(line)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
