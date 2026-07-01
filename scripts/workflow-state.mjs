#!/usr/bin/env node
// CLI for the 14-stage development pipeline state machine. See CLAUDE.md for the full stage table.
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_DIR = join(__dirname, '..', '.claude', 'workflow')
const STATE_FILE = join(STATE_DIR, 'state.json')

export const STAGES = [
  { id: 'requirement', skill: 'requirement-analysis' },
  { id: 'solution_design', skill: 'solution-design' },
  { id: 'solution_review', skill: 'solution-review' },
  { id: 'unit_test_write', skill: 'unit-test-analysis' },
  { id: 'unit_test_review', skill: 'unit-test-review' },
  { id: 'implementation', skill: 'solution-implementation' },
  { id: 'refactor', skill: 'solution-refactor' },
  { id: 'e2e_test_write', skill: 'e2e-test-analysis' },
  { id: 'e2e_test_review', skill: 'e2e-test-review' },
  { id: 'e2e_execution', skill: 'e2e-test-execution' },
  { id: 'manual_testing', skill: 'manual-testing' },
  { id: 'deploy_branch', skill: 'deploy-branch' },
  { id: 'deploy_main', skill: 'deploy-main' },
  { id: 'report', skill: 'post-deploy-report' },
]

function stageIndex(id) {
  const i = STAGES.findIndex((s) => s.id === id)
  if (i === -1)
    throw new Error(`Unknown stage "${id}". Valid stages: ${STAGES.map((s) => s.id).join(', ')}`)
  return i
}

function nextStage(id) {
  const i = stageIndex(id)
  return i + 1 < STAGES.length ? STAGES[i + 1].id : null
}

function nowIso() {
  return new Date().toISOString()
}

function loadState() {
  if (!existsSync(STATE_FILE)) return null
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n')
}

function requireState() {
  const state = loadState()
  if (!state) {
    console.error('No active workflow. Run: node scripts/workflow-state.mjs start')
    process.exit(1)
  }
  return state
}

function cmdStart() {
  if (existsSync(STATE_FILE)) {
    console.error('A workflow is already active. Run "get" to inspect it, or "reset" to clear it.')
    process.exit(1)
  }
  const state = {
    stage: STAGES[0].id,
    pending_next_step: STAGES[0].skill,
    started_at: nowIso(),
    completed_at: null,
    branch: null,
    pr_number: null,
    fields: {},
    timestamps: { [STAGES[0].id]: { started_at: nowIso(), completed_at: null } },
    loops: [],
    bugs: [],
  }
  saveState(state)
  console.log(JSON.stringify(state, null, 2))
}

function cmdGet() {
  const state = requireState()
  console.log(JSON.stringify(state, null, 2))
}

function cmdSet(key, value) {
  const state = requireState()
  state.fields[key] = value
  saveState(state)
  console.log(`Set ${key}`)
}

function cmdApprove(stageId) {
  const state = requireState()
  if (state.stage !== stageId) {
    console.error(`Cannot approve "${stageId}" — current stage is "${state.stage}".`)
    process.exit(1)
  }
  state.timestamps[stageId] = state.timestamps[stageId] || {}
  state.timestamps[stageId].completed_at = nowIso()

  const next = nextStage(stageId)
  if (next === null) {
    state.stage = 'done'
    state.pending_next_step = null
    state.completed_at = nowIso()
  } else {
    state.stage = next
    state.pending_next_step = STAGES.find((s) => s.id === next).skill
    state.timestamps[next] = state.timestamps[next] || { started_at: nowIso(), completed_at: null }
  }
  saveState(state)
  console.log(JSON.stringify(state, null, 2))
}

function cmdLoopback(targetStageId, reason = '') {
  const state = requireState()
  stageIndex(targetStageId) // validates
  state.loops.push({ from: state.stage, to: targetStageId, reason, at: nowIso() })
  state.stage = targetStageId
  state.pending_next_step = STAGES.find((s) => s.id === targetStageId).skill
  state.timestamps[targetStageId] = state.timestamps[targetStageId] || {}
  state.timestamps[targetStageId].started_at = nowIso()
  state.timestamps[targetStageId].completed_at = null
  saveState(state)
  console.log(JSON.stringify(state, null, 2))
}

function cmdLogBug(category, number, title) {
  const state = requireState()
  state.bugs.push({ category, number: Number(number), title, opened_at: nowIso(), closed_at: null })
  saveState(state)
  console.log(`Logged bug #${number} (${category})`)
}

function cmdCloseBug(number) {
  const state = requireState()
  const bug = state.bugs.find((b) => b.number === Number(number))
  if (!bug) {
    console.error(`No tracked bug #${number} in the active workflow.`)
    process.exit(1)
  }
  bug.closed_at = nowIso()
  saveState(state)
  console.log(`Closed bug #${number}`)
}

function cmdReset() {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE)
  }
  console.log('Workflow state reset.')
}

const [, , cmd, ...args] = process.argv

switch (cmd) {
  case 'start':
    cmdStart()
    break
  case 'get':
    cmdGet()
    break
  case 'set':
    if (args.length < 2) {
      console.error('Usage: workflow-state.mjs set <key> <value>')
      process.exit(1)
    }
    cmdSet(args[0], args.slice(1).join(' '))
    break
  case 'approve':
    if (args.length < 1) {
      console.error('Usage: workflow-state.mjs approve <stage>')
      process.exit(1)
    }
    cmdApprove(args[0])
    break
  case 'loopback':
    if (args.length < 1) {
      console.error('Usage: workflow-state.mjs loopback <stage> [reason]')
      process.exit(1)
    }
    cmdLoopback(args[0], args.slice(1).join(' '))
    break
  case 'log-bug':
    if (args.length < 3) {
      console.error('Usage: workflow-state.mjs log-bug <category> <issueNumber> <title>')
      process.exit(1)
    }
    cmdLogBug(args[0], args[1], args.slice(2).join(' '))
    break
  case 'close-bug':
    if (args.length < 1) {
      console.error('Usage: workflow-state.mjs close-bug <issueNumber>')
      process.exit(1)
    }
    cmdCloseBug(args[0])
    break
  case 'reset':
    cmdReset()
    break
  default:
    console.error(
      'Usage: workflow-state.mjs <start|get|set|approve|loopback|log-bug|close-bug|reset> [...args]'
    )
    process.exit(1)
}
