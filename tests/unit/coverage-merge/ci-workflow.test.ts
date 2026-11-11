import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// .github/workflows/ci.yml's coverage-merge job (#215, REQ-018, REQ-024) plus the cheap
// REQ-025 guards. The workflow is read as text (no YAML dependency).

const root = path.resolve(__dirname, '../../..')
const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8')
const standards = fs.readFileSync(path.join(root, '.claude/STANDARDS.md'), 'utf8')

/** The step text of "Run combined coverage and enforce threshold" and the job's env block. */
function coverageJob(text: string) {
  const start = text.search(/^ {2}coverage-merge:\s*$/m)
  if (start === -1) throw new Error('coverage-merge job not found')
  const rest = text.slice(start + 1)
  const next = rest.search(/^ {2}[A-Za-z0-9_-]+:\s*$/m)
  const job = next === -1 ? rest : rest.slice(0, next)
  const stepAt = job.indexOf('- name: Run combined coverage and enforce threshold')
  if (stepAt === -1) throw new Error('coverage step not found')
  return { job, step: job.slice(stepAt) }
}

/** Every way the step can fail to gate on the script; an empty list means conformant. */
function coverageStepProblems(text: string, thresholdFromStandards = 90): string[] {
  const { job, step } = coverageJob(text)
  const problems: string[] = []
  if (!/^\s*shell:\s*bash\s*$/m.test(step) && !/set -o pipefail/.test(step)) {
    problems.push('pipefail: step needs `shell: bash` or `set -o pipefail`')
  }
  if (!/Combined coverage: \[0-9\.\]\+/.test(step)) problems.push('statement grep pattern')
  if (!/Combined branch coverage: \[0-9\.\]\+/.test(step)) problems.push('branch grep pattern')
  const assign = (name: string) =>
    step.split(/\r?\n/).find((l) => l.trim().startsWith(`${name}=$(`))
  for (const name of ['stmt', 'branch']) {
    const line = assign(name)
    if (!line) problems.push(`${name} assignment missing`)
    else if (!/\)\s*\|\|\s*true\s*$/.test(line)) problems.push(`${name} assignment needs || true`)
  }
  if (!/"\$COVERAGE_THRESHOLD"/.test(step)) {
    problems.push('statement gate does not use $COVERAGE_THRESHOLD')
  }
  if (!/"\$BRANCH_COVERAGE_THRESHOLD"/.test(step)) {
    problems.push('branch gate does not use $BRANCH_COVERAGE_THRESHOLD')
  }
  if ((step.match(/awk /g) ?? []).length < 2) problems.push('both awk gates required')
  const tee = step.split(/\r?\n/).find((l) => l.includes('npm run test:coverage:merge'))
  if (!tee) problems.push('merge command missing')
  else if (!/\|\s*tee\b/.test(tee)) problems.push('output must be piped to tee')
  else if (/\|\|\s*true/.test(tee)) problems.push('the merge command must not be suffixed || true')
  const env = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)`).exec(job)?.[1])
  if (env('COVERAGE_THRESHOLD') !== thresholdFromStandards) problems.push('COVERAGE_THRESHOLD')
  if (env('BRANCH_COVERAGE_THRESHOLD') !== thresholdFromStandards) {
    problems.push('BRANCH_COVERAGE_THRESHOLD')
  }
  return problems
}

const threshold = Number(/at least (\d+)%/.exec(standards.replace(/\s+/g, ' '))?.[1])

describe('ci.yml coverage-merge job (REQ-018)', () => {
  it('the documented threshold in STANDARDS.md is parseable', () => {
    expect(threshold).toBe(90)
  })

  it('the step fails on the script non-zero exit even through tee, parses both contract lines and gates both', () => {
    expect(coverageStepProblems(ci, threshold)).toEqual([])
  })

  it('both grep assignments end with `|| true` so the "Could not parse" messages stay reachable', () => {
    const { step } = coverageJob(ci)
    expect(step).toMatch(/stmt=\$\(.*\)\s*\|\|\s*true\s*$/m)
    expect(step).toMatch(/branch=\$\(.*\)\s*\|\|\s*true\s*$/m)
    expect(step).toContain('Could not parse combined statement coverage')
    expect(step).toContain('Could not parse combined branch coverage')
  })

  it('the `npm run test:coverage:merge | tee` line is not itself suffixed with `|| true`', () => {
    const { step } = coverageJob(ci)
    const line = step
      .split(/\r?\n/)
      .find((l) => l.includes('npm run test:coverage:merge')) as string
    expect(line).toMatch(/\|\s*tee\b/)
    expect(line).not.toMatch(/\|\|\s*true/)
  })

  describe('the assertion function rejects a broken step (mutation cases)', () => {
    it('removing `shell: bash` is caught', () => {
      const mutated = ci.replace(/^\s*shell:\s*bash\s*\r?\n/m, '')
      expect(mutated).not.toBe(ci)
      expect(coverageStepProblems(mutated, threshold).join('\n')).toMatch(/pipefail/)
    })

    it('dropping `|| true` from a grep assignment is caught', () => {
      const mutated = ci.replace(/(branch=\$\(.*\))\s*\|\|\s*true/, '$1')
      expect(mutated).not.toBe(ci)
      expect(coverageStepProblems(mutated, threshold).join('\n')).toMatch(/branch assignment needs/)
    })

    it('suffixing the merge command with `|| true` is caught', () => {
      const mutated = ci.replace(
        /(npm run test:coverage:merge \| tee coverage-output\.txt)/,
        '$1 || true'
      )
      expect(mutated).not.toBe(ci)
      expect(coverageStepProblems(mutated, threshold).join('\n')).toMatch(/must not be suffixed/)
    })

    it('a threshold that drifts from STANDARDS.md is caught', () => {
      const mutated = ci.replace(/BRANCH_COVERAGE_THRESHOLD: 90/, 'BRANCH_COVERAGE_THRESHOLD: 80')
      expect(mutated).not.toBe(ci)
      expect(coverageStepProblems(mutated, threshold).join('\n')).toMatch(
        /BRANCH_COVERAGE_THRESHOLD/
      )
    })
  })
})

describe('method version and ADR guards (REQ-025)', () => {
  it('STANDARDS.md records the v3 coverage method version', () => {
    expect(standards).toContain('Coverage method version:** `v3`')
  })

  it('ADR 0009 exists', () => {
    const adrs = fs.readdirSync(path.join(root, 'docs/adr'))
    expect(adrs.some((f) => /^0009-.*\.md$/.test(f))).toBe(true)
  })
})
