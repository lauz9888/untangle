#!/usr/bin/env node
// CI docs-check (pipeline step 13i): if src/ changed, CLAUDE.md or README.md must
// also have changed in the same PR — otherwise the wiki likely needs an update too.
// This does not edit the wiki itself; /wiki-update (run locally after merge) does that.
import { execSync } from 'node:child_process'

const SKIP_MARKER = '[docs skip]'

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'main'

let changedFiles
try {
  changedFiles = sh(`git diff --name-only ${base}...HEAD`).split('\n').filter(Boolean)
} catch (err) {
  console.error(`Could not diff against ${base}: ${err.message}`)
  process.exit(1)
}

const lastCommitMessage = sh('git log -1 --pretty=%B')
if (lastCommitMessage.includes(SKIP_MARKER)) {
  console.log(`Docs check skipped via "${SKIP_MARKER}" marker.`)
  process.exit(0)
}

const srcChanged = changedFiles.some((f) => f.startsWith('src/'))
const docsChanged = changedFiles.some((f) => f === 'CLAUDE.md' || f === 'README.md')

if (srcChanged && !docsChanged) {
  console.error(
    'src/ changed but neither CLAUDE.md nor README.md was touched.\n' +
      'Update the docs to reflect this change, or add "[docs skip]" to the last commit message if none are needed.\n' +
      'Remember: the wiki itself is updated separately via /wiki-update after merge.'
  )
  process.exit(1)
}

console.log('Docs check passed.')
