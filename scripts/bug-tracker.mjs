#!/usr/bin/env node
// Usage:
//   node scripts/bug-tracker.mjs create --title "..." --body "..." --source "development|qa-review|unit-test|e2e-test|manual|ci-unit-tests|ci-e2e-tests"
//   node scripts/bug-tracker.mjs close  --number 42 --cause "..." --fix "..."
//   node scripts/bug-tracker.mjs find   --title "..."   → prints issue number, or nothing
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Maps source values to a GitHub label that records the detection process.
const PROCESS_LABELS = {
  'development':   { name: 'found:development', color: '0075ca', description: 'Identified during development' },
  'qa-review':     { name: 'found:qa',          color: 'e4e669', description: 'Identified during QA review' },
  'unit-test':     { name: 'found:qa',          color: 'e4e669', description: 'Identified during QA review' },
  'e2e-test':      { name: 'found:qa',          color: 'e4e669', description: 'Identified during QA review' },
  'ci-unit-tests': { name: 'found:ci',          color: 'd876e3', description: 'Identified in CI pipeline' },
  'ci-e2e-tests':  { name: 'found:ci',          color: 'd876e3', description: 'Identified in CI pipeline' },
  'manual':        { name: 'found:manual',      color: '0e8a16', description: 'Reported manually' },
};

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i]?.startsWith('--') && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) {
      opts[argv[i].slice(2)] = argv[i + 1];
      i++;
    } else if (argv[i]?.startsWith('--')) {
      opts[argv[i].slice(2)] = '';
    }
  }
  return opts;
}

function gh(...args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(r.stderr?.trim() || `gh exited with status ${r.status}`);
  return r.stdout.trim();
}

function withTempFile(content, fn) {
  const path = join(tmpdir(), `bug-tracker-${process.pid}-${Date.now()}.md`);
  writeFileSync(path, content, 'utf8');
  try {
    return fn(path);
  } finally {
    try { unlinkSync(path); } catch {}
  }
}

function ensureBugLabel() {
  try {
    gh('label', 'create', 'bug', '--color', 'd73a4a', '--description', "Something isn't working", '--force');
  } catch {}
}

function ensureProcessLabel(source) {
  const meta = PROCESS_LABELS[source];
  if (!meta) return null;
  try {
    gh('label', 'create', meta.name, '--color', meta.color, '--description', meta.description, '--force');
  } catch {}
  return meta.name;
}

function openBugIssues() {
  const out = gh('issue', 'list', '--label', 'bug', '--state', 'open', '--json', 'title,number', '--limit', '100');
  return JSON.parse(out);
}

const [,, command, ...rest] = process.argv;
const opts = parseArgs(rest);

if (command === 'create') {
  const { title, body = '', source = 'unknown' } = opts;
  if (!title) { console.error('--title is required'); process.exit(1); }

  ensureBugLabel();
  const processLabel = ensureProcessLabel(source);

  const existing = openBugIssues();
  const dup = existing.find(i => i.title === title);
  if (dup) {
    process.stdout.write(`EXISTS:${dup.number}\n`);
    process.exit(0);
  }

  const fullBody = `**Detected by:** ${source}\n\n${body}`;
  const labelArgs = processLabel
    ? ['--label', 'bug', '--label', processLabel]
    : ['--label', 'bug'];
  const url = withTempFile(fullBody, f =>
    gh('issue', 'create', '--title', title, '--body-file', f, ...labelArgs)
  );
  const num = url.match(/\/(\d+)$/)?.[1];
  if (num) process.stdout.write(`CREATED:${num}\n`);

} else if (command === 'close') {
  const { number, cause = 'See linked commit', fix = 'See linked commit' } = opts;
  if (!number) { console.error('--number is required'); process.exit(1); }

  const comment = `**Bug resolved.**\n\n**Root cause:** ${cause}\n\n**Fix applied:** ${fix}`;
  withTempFile(comment, f => gh('issue', 'comment', number, '--body-file', f));
  gh('issue', 'close', number);
  process.stdout.write(`CLOSED:${number}\n`);

} else if (command === 'find') {
  const { title } = opts;
  if (!title) { console.error('--title is required'); process.exit(1); }

  const existing = openBugIssues();
  const found = existing.find(i => i.title === title);
  if (found) process.stdout.write(`${found.number}\n`);

} else {
  console.error(`Unknown command: ${command}`);
  console.error('Commands: create, close, find');
  process.exit(1);
}
