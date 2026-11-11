// Coverage-merge pipeline for `npm run test:coverage:merge`. Runs four test
// layers and combines them into one accurate statement and branch coverage
// figure:
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
// builds one statement/branch/function universe from unit + Storybook and
// credits BDD/e2e hits onto keys that already exist in it, then runtime guards
// (flat e2e layer, e2e template parity, universe completeness, dedupe
// effectiveness) fail the run if the figure cannot be trusted. Both the
// statement and branch figures are gated (thresholds in `.claude/STANDARDS.md`).
// See docs/adr/0007-single-statement-universe-and-istanbul-e2e-for-combined-coverage.md.
// Note why `.nyc_output/` must be reset between the BDD and e2e phases below.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import istanbulLibCoverage from 'istanbul-lib-coverage'
import istanbulLibReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import {
  UNIVERSE_EXCLUDES,
  assertDedupeEffective,
  assertE2eLayerIsReal,
  assertE2eTemplateParity,
  assertUniverseComplete,
  combineCoverage,
  loadLayers,
} from './lib/coverage-merge.mjs'

const { createCoverageMap } = istanbulLibCoverage
const { createContext } = istanbulLibReport

const root = process.cwd()
const coverageDir = path.join(root, 'coverage')
const nycOutputDir = path.join(root, '.nyc_output')

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

// Minimal glob matcher for UNIVERSE_EXCLUDES: `**/` spans any number of
// directories, a trailing `**` matches anything below, `*` stays within one
// segment (`src/**/*.stories.ts`, `src/**/__mocks__/**`).
function globToRegExp(pattern) {
  const source = pattern
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?'
      if (part === '**') return '.*'
      if (part === '*') return '[^/]*'
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${source}$`)
}

function isExcluded(relPath) {
  return UNIVERSE_EXCLUDES.some((pattern) => globToRegExp(pattern).test(relPath))
}

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

// 6. Load all four layers (a missing layer file throws), run the guards, and
// combine into one universe.
const layers = loadLayers(coverageDir)
const readSource = (file) => fs.readFileSync(file, 'utf8')

assertE2eLayerIsReal(layers.e2e)
assertE2eTemplateParity(layers.e2e, layers.unit, readSource)

const input = { primary: [layers.unit, layers.storybook], secondary: [layers.bdd, layers.e2e] }
const result = combineCoverage(input)

const universeFiles = Object.keys(result.data)
const diskFiles = listSourceFiles(path.join(root, 'src'))
  .map((f) => f.split(path.win32.sep).join(path.posix.sep))
  .filter((f) => !isExcluded(f.slice(f.indexOf('/src/') + 1)))
assertUniverseComplete(
  universeFiles.map((f) => f.slice(f.lastIndexOf('/src/') + 1)),
  diskFiles.map((f) => f.slice(f.lastIndexOf('/src/') + 1))
)
assertDedupeEffective(input, result)

const ig = result.ignored
const fmt = (t) => `statements=${t.statements} branches=${t.branches} functions=${t.functions}`
console.log(
  `Ignored secondary-only items (not in the unit/Storybook universe): bdd ${fmt(ig.bdd)}; e2e ${fmt(ig.e2e)}`
)

const map = createCoverageMap(result.data)
const mergedDir = path.join(coverageDir, 'merged')
fs.mkdirSync(mergedDir, { recursive: true })
fs.writeFileSync(path.join(mergedDir, 'coverage-final.json'), JSON.stringify(map.toJSON()))

// 7. Print a text-summary, then the gate figures. The statement line is the
// last line of output (parsed by qa-reviewer at pipeline Step 12, and by CI's
// coverage-merge job, which also greps the branch line).
const context = createContext({ dir: mergedDir, coverageMap: map })
reports.create('text-summary', {}).execute(context)

const combined = map.files().reduce((acc, file) => {
  const fileSummary = map.fileCoverageFor(file).toSummary()
  return acc ? acc.merge(fileSummary) : fileSummary
}, undefined)

if (!combined || combined.statements.total === 0) {
  throw new Error('Merged coverage contains zero statements')
}

const { statements, branches } = combined
console.log(
  `Combined branch coverage: ${branches.pct.toFixed(2)}% (${branches.covered}/${branches.total} branches)`
)
console.log(
  `Combined coverage: ${statements.pct.toFixed(2)}% (${statements.covered}/${statements.total} statements)`
)
