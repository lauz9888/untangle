#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';

function getRepoRoot() {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

const STATE_PATH = join(getRepoRoot(), '.claude', 'workflow', 'state.json');
const STATE_DIR = dirname(STATE_PATH);

function readState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  state.last_updated = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

const NEXT_STEP = {
  'requirement':    'solution-analysis',
  'solution':       'solution-implementation',
  'implementation': 'implementation-analysis',
  'unit-tests':     'e2e-test-analysis',
  'e2e-tests':      'document-analysis',
  'docs':           'deploy',
};

const cmd = process.argv[2];

if (cmd === 'get') {
  console.log(JSON.stringify(readState(), null, 2));

} else if (cmd === 'start') {
  const reqText = process.argv.slice(3).join(' ') || null;
  writeState({
    active: true,
    current_step: 'requirement-analysis',
    requirement_text: reqText,
    requirement_approved: false,
    solution_text: null,
    solution_approved: false,
    implementation_summary: null,
    implementation_approved: false,
    unit_tests_done: false,
    e2e_tests_done: false,
    docs_done: false,
    awaiting_input: null,
    pending_next_step: null,
    loop_back_from: null,
    loop_back_reason: null,
    started_at: new Date().toISOString(),
  });
  console.log('Workflow started.');

} else if (cmd === 'approve') {
  const step = process.argv[3];
  const state = readState() || { active: true };
  const flagMap = {
    'requirement':    () => { state.requirement_approved = true; },
    'solution':       () => { state.solution_approved = true; },
    'implementation': () => { state.implementation_approved = true; },
    'unit-tests':     () => { state.unit_tests_done = true; },
    'e2e-tests':      () => { state.e2e_tests_done = true; },
    'docs':           () => { state.docs_done = true; },
  };
  if (!flagMap[step]) {
    console.error(`Unknown step: ${step}. Valid: ${Object.keys(flagMap).join(', ')}`);
    process.exit(1);
  }
  flagMap[step]();
  state.awaiting_input = null;
  state.pending_next_step = NEXT_STEP[step];
  writeState(state);
  console.log(`Approved: ${step}. Queued next step: ${NEXT_STEP[step]}`);

} else if (cmd === 'set') {
  const key = process.argv[3];
  const value = process.argv.slice(4).join(' ');
  const state = readState() || { active: true };
  try { state[key] = JSON.parse(value); } catch { state[key] = value; }
  writeState(state);

} else if (cmd === 'await-input') {
  const question = process.argv.slice(3).join(' ');
  const state = readState() || { active: true };
  state.awaiting_input = question || true;
  writeState(state);
  console.log('Workflow paused — awaiting developer input.');

} else if (cmd === 'clear-awaiting') {
  const state = readState() || { active: true };
  state.awaiting_input = null;
  writeState(state);
  console.log('Awaiting-input cleared.');

} else if (cmd === 'loop-back') {
  const target = process.argv[3];
  const reason = process.argv.slice(4).join(' ');
  const state = readState() || { active: true };
  state.loop_back_from = state.current_step || null;
  state.loop_back_reason = reason;
  state.pending_next_step = target;
  writeState(state);
  console.log(`Loop-back to ${target} scheduled: ${reason}`);

} else if (cmd === 'reset') {
  writeState({ active: false });
  console.log('Workflow reset.');

} else if (cmd === 'check-transition') {
  // Stop hook: exit 2 if a step transition is pending so Claude continues its turn
  const state = readState();
  if (!state?.active || !state.pending_next_step) process.exit(0);
  if (state.awaiting_input) process.exit(0); // blocked waiting for developer answer

  const next = state.pending_next_step;
  const loopFrom = state.loop_back_from;
  const loopReason = state.loop_back_reason;

  state.current_step = next;
  state.pending_next_step = null;
  if (!loopReason) {
    state.loop_back_from = null;
    state.loop_back_reason = null;
  }
  writeState(state);

  if (loopReason) {
    process.stdout.write(
      `[WORKFLOW] Loop-back from ${loopFrom} — reason: ${loopReason}\n` +
      `You must immediately run /${next} with this context. Do not ask the user first.`
    );
  } else {
    process.stdout.write(
      `[WORKFLOW] Previous step complete. You must immediately run /${next}. Do not ask the user first.`
    );
  }
  process.exit(2);

} else if (cmd === 'check-prompt') {
  // UserPromptSubmit hook: inject workflow context into the conversation
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    const state = readState();

    if (state?.active) {
      const lines = [
        `[WORKFLOW ACTIVE] Current step: ${state.current_step}`,
        `Requirements: ${state.requirement_approved ? 'APPROVED' : 'pending'} — ${state.requirement_text || 'not yet captured'}`,
        `Solution: ${state.solution_approved ? 'APPROVED' : 'pending'} — ${state.solution_text || 'not yet defined'}`,
        `Implementation: ${state.implementation_approved ? 'APPROVED' : 'pending'}${state.implementation_summary ? ' — ' + state.implementation_summary : ''}`,
        `Unit tests: ${state.unit_tests_done ? 'done' : 'pending'}`,
        `E2E tests: ${state.e2e_tests_done ? 'done' : 'pending'}`,
        `Docs: ${state.docs_done ? 'done' : 'pending'}`,
      ];
      if (state.loop_back_reason) lines.push(`Loop-back reason: ${state.loop_back_reason}`);
      if (state.awaiting_input && state.awaiting_input !== true) {
        lines.push(`Awaiting your answer to: ${state.awaiting_input}`);
      } else if (state.awaiting_input) {
        lines.push(`Awaiting your answer to the last question asked.`);
      }
      process.stdout.write(lines.join('\n'));
      process.exit(0);
    }

    // No active workflow: detect change requests and suggest starting the workflow
    let userMsg = '';
    try {
      const data = JSON.parse(input);
      userMsg = data.prompt || '';
    } catch { /* ignore parse errors */ }

    const isChangeRequest =
      /\b(add|create|build|implement|make|fix|update|change|modify|delete|remove|refactor|introduce|write|develop)\b/i.test(userMsg) &&
      !/^(what|how|why|when|where|can you explain|tell me|show me|describe|is it|does it|do you)\b/i.test(userMsg.trim());

    if (isChangeRequest) {
      process.stdout.write(
        '[WORKFLOW] This looks like a code change request. ' +
        'Start the development workflow immediately by running /requirement-analysis. ' +
        'Do not ask the user first — just begin.'
      );
    }
    process.exit(0);
  });

} else {
  console.error('Usage: node scripts/workflow-state.mjs <get|start|approve|set|await-input|clear-awaiting|loop-back|reset|check-transition|check-prompt>');
  process.exit(1);
}
