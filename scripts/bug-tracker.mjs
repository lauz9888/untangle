#!/usr/bin/env node
// Usage:
//   node scripts/bug-tracker.mjs create --title "..." --body "..." --source "qa-review|unit-test|e2e-test|manual|ci"
//   node scripts/bug-tracker.mjs close  --number 42 --cause "..." --fix "..."
//   node scripts/bug-tracker.mjs find   --title "..."   → prints issue number, or nothing
import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

  const existing = openBugIssues();
  const dup = existing.find(i => i.title === title);
  if (dup) {
    process.stdout.write(`EXISTS:${dup.number}\n`);
    process.exit(0);
  }

  const fullBody = `**Detected by:** ${source}\n\n${body}`;
  const url = withTempFile(fullBody, f =>
    gh('issue', 'create', '--title', title, '--body-file', f, '--label', 'bug')
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
