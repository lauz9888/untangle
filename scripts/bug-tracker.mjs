#!/usr/bin/env node
// CLI for creating/closing GitHub issues that back the pipeline's bug tracking.
// Every category maps 1:1 to a pipeline stage — see CLAUDE.md for the full table.
import { execFileSync } from 'node:child_process'

export const CATEGORIES = [
  'requirement',
  'design',
  'unit-test',
  'implementation',
  'refactor',
  'e2e-test',
  'e2e',
  'manual',
  'ci-lint',
  'ci-build',
  'ci-unit-tests',
  'ci-coverage',
  'ci-e2e',
  'ci-a11y',
  'ci-security',
  'ci-pwa',
  'ci-docs',
]

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim()
}

function assertCategory(category) {
  if (!CATEGORIES.includes(category)) {
    console.error(`Unknown category "${category}". Valid categories: ${CATEGORIES.join(', ')}`)
    process.exit(1)
  }
}

function ensureLabel(category) {
  try {
    gh(['label', 'create', category, '--color', 'ededed', '--force'])
  } catch {
    // label already exists with same settings, or repo has no write access in this context — non-fatal
  }
  try {
    gh(['label', 'create', 'bug', '--color', 'd73a4a', '--force'])
  } catch {
    // already exists
  }
}

function findOpenIssueByTitle(title) {
  const out = gh([
    'issue',
    'list',
    '--state',
    'open',
    '--search',
    `"${title}" in:title`,
    '--json',
    'number,title',
  ])
  const issues = JSON.parse(out || '[]')
  return issues.find((i) => i.title === title)
}

function cmdCreate(category, title, body = '') {
  assertCategory(category)
  const existing = findOpenIssueByTitle(title)
  if (existing) {
    console.log(`Issue #${existing.number} already open for "${title}" — skipping create.`)
    console.log(existing.number)
    return
  }
  ensureLabel(category)
  const fullBody = `${body}\n\n**Detected by:** ${category}`.trim()
  const url = gh([
    'issue',
    'create',
    '--title',
    title,
    '--body',
    fullBody,
    '--label',
    'bug',
    '--label',
    category,
  ])
  const number = url.split('/').pop()
  console.log(`Created issue #${number}: ${title}`)
  console.log(number)
}

function cmdClose(number, comment = '') {
  const args = ['issue', 'close', String(number)]
  if (comment) args.push('--comment', comment)
  gh(args)
  console.log(`Closed issue #${number}`)
}

function cmdList(category) {
  const args = ['issue', 'list', '--state', 'all', '--json', 'number,title,state,labels']
  if (category) {
    assertCategory(category)
    args.push('--label', category)
  }
  console.log(gh(args))
}

const [, , cmd, ...args] = process.argv

switch (cmd) {
  case 'create':
    if (args.length < 2) {
      console.error('Usage: bug-tracker.mjs create <category> <title> [body]')
      process.exit(1)
    }
    cmdCreate(args[0], args[1], args.slice(2).join(' '))
    break
  case 'close':
    if (args.length < 1) {
      console.error('Usage: bug-tracker.mjs close <issueNumber> [comment]')
      process.exit(1)
    }
    cmdClose(args[0], args.slice(1).join(' '))
    break
  case 'list':
    cmdList(args[0])
    break
  default:
    console.error('Usage: bug-tracker.mjs <create|close|list> [...args]')
    process.exit(1)
}
