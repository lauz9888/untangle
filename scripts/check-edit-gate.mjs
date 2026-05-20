#!/usr/bin/env node
// PreToolUse hook: block Edit/Write on src/ files until the solution is approved.
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, relative } from 'path';

function getRepoRoot() {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let toolInput;
  try {
    const data = JSON.parse(input);
    toolInput = data.tool_input || {};
  } catch {
    process.exit(0);
  }

  const filePath = toolInput.file_path || '';
  if (!filePath) process.exit(0);

  const repoRoot = getRepoRoot();

  // Block all edits directly on main — work must be on a feature branch.
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (currentBranch === 'main') {
      process.stdout.write(
        `[BRANCH PROTECTION] Cannot edit files directly on the main branch.\n` +
        `All changes must be made on a feature branch. Run /solution-analysis to create one, ` +
        `or manually: git checkout -b feature/<name>`
      );
      process.exit(2);
    }
  } catch {
    // If branch detection fails, fall through and allow the edit.
  }

  const rel = relative(repoRoot, filePath).replace(/\\/g, '/');

  // Only gate src/ edits — tests, scripts, config, docs are unrestricted.
  if (!rel.startsWith('src/')) process.exit(0);

  const statePath = join(repoRoot, '.claude', 'workflow', 'state.json');
  if (!existsSync(statePath)) process.exit(0);

  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {
    process.exit(0);
  }

  if (!state?.active) process.exit(0);
  if (state.solution_approved) process.exit(0);

  process.stdout.write(
    `[WORKFLOW GATE] Cannot edit src/ — workflow is at step "${state.current_step}" and the solution has not been approved yet.\n` +
    `Complete /requirement-analysis then /solution-analysis first. Editing src/ is only permitted once the solution is approved.`
  );
  process.exit(2);
});
