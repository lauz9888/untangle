#!/usr/bin/env node
// Invoked by .husky/post-commit. Any commit whose message contains "Fixes #N", "Closes #N",
// or "Resolves #N" gets that issue commented on and closed automatically.
import { execSync, execFileSync } from 'node:child_process'

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

const message = sh('git log -1 --pretty=%B')
const matches = [...message.matchAll(/\b(?:Fixes|Closes|Resolves)\s+#(\d+)/gi)]

if (matches.length === 0) process.exit(0)

const sha = sh('git rev-parse --short HEAD')
const summary = message.split('\n')[0]

for (const [, number] of matches) {
  try {
    execFileSync('gh', ['issue', 'close', number, '--comment', `Fixed by ${sha}: ${summary}`], {
      stdio: 'inherit',
    })
  } catch (err) {
    console.warn(`Could not close issue #${number}: ${err.message}`)
  }
}
