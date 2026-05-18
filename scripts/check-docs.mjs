#!/usr/bin/env node
/**
 * Documentation / README check.
 *
 * Verifies that README.md exists, has meaningful content, and contains the
 * key sections users and contributors depend on. Run in CI on the main
 * pipeline before deploying to production.
 *
 * Exit 0 = pass, exit 1 = fail.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()

const REQUIRED_FILES = ['README.md']

const REQUIRED_SECTIONS = [
  { heading: /^#{1,2}\s+.*(using|install|get.?start)/i, label: 'usage / installation section' },
  { heading: /^#{1,2}\s+.*(making change|contribut|develop)/i, label: 'developer / contributing section' },
]

const MIN_README_CHARS = 300

let failed = false

function fail(msg) {
  console.error(`✗ ${msg}`)
  failed = true
}

function pass(msg) {
  console.log(`✓ ${msg}`)
}

// 1. Required files exist and have content
for (const file of REQUIRED_FILES) {
  const filePath = join(ROOT, file)
  if (!existsSync(filePath)) {
    fail(`${file} is missing`)
    continue
  }
  const content = readFileSync(filePath, 'utf8').trim()
  if (content.length < MIN_README_CHARS) {
    fail(`${file} looks too short (${content.length} chars — expected at least ${MIN_README_CHARS})`)
    continue
  }
  pass(`${file} exists and has content`)

  // 2. Required sections are present in README
  for (const { heading, label } of REQUIRED_SECTIONS) {
    const lines = content.split('\n')
    const found = lines.some((line) => heading.test(line))
    if (!found) {
      fail(`README.md is missing a ${label}`)
    } else {
      pass(`README.md has a ${label}`)
    }
  }
}

if (failed) {
  console.error('\nDocs check failed. Update the documentation before merging to main.')
  process.exit(1)
} else {
  console.log('\nDocs check passed.')
}
