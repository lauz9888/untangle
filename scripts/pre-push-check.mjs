#!/usr/bin/env node
// Invoked by .husky/pre-push. Blocks direct pushes to main (everything must go through a
// PR — see deploy-branch/deploy-main) and, for feature branches, requires that unit tests,
// e2e tests, and manual testing have all been signed off in the active workflow state
// before the branch can be pushed for CI/PR.
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = join(__dirname, '..', '.claude', 'workflow', 'state.json')

const REQUIRED_SIGNOFFS = ['unit_test_review', 'e2e_test_review', 'manual_testing']

let input = ''
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  const lines = input.split('\n').filter(Boolean)

  for (const line of lines) {
    const [, , remoteRef] = line.split(' ')
    if (remoteRef === 'refs/heads/main') {
      console.error(
        'Direct pushes to main are blocked. Push a branch and let deploy-branch/deploy-main open and merge a PR.'
      )
      process.exit(1)
    }
  }

  if (!existsSync(STATE_FILE)) {
    console.warn('No active pipeline workflow found — allowing push without stage sign-off checks.')
    process.exit(0)
  }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  const missing = REQUIRED_SIGNOFFS.filter((stage) => !state.timestamps?.[stage]?.completed_at)
  if (missing.length > 0) {
    console.error(
      `Push blocked — the active workflow has not signed off: ${missing.join(', ')}.\n` +
        'Complete these pipeline stages before deploy-branch pushes this branch.'
    )
    process.exit(1)
  }

  process.exit(0)
})
