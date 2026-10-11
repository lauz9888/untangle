import { Given, When, Then, After } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'

// Drives useCelebration()/useCompletedPanel()/useTaskDetail() directly (the same
// singletons components share). "Absent from the board" is asserted through the
// shared groupActiveTasksBySection helper that NowNextLaterBoard.vue renders from,
// not a bare store filter. Reused steps: task-store.steps.ts ("I have added a
// task named ..."), task-detail.steps.ts (detail view open / set name / closed).
//
// The new modules are loaded lazily via require() so that, while they do not
// exist yet, only scenarios in this feature fail (not every feature at load time).
// The implementer may convert these to static imports once the modules exist.
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

function celebration(): any {
  return require('../../src/composables/useCelebration').useCelebration()
}
function completedPanel(): any {
  return require('../../src/composables/useCompletedPanel').useCompletedPanel()
}
function boardOrdering(): any {
  return require('../../src/composables/useBoardOrdering')
}

let celebrationCountSnapshot = 0

function taskId(world: EnergyWorld, name: string): number {
  const task = world.tasks.tasks.value.find((t) => t.name === name)
  assert.ok(task, `No task named "${name}" found in the store`)
  return task!.id
}

function boardNames(world: EnergyWorld, key: 'now' | 'next' | 'later'): string[] {
  const grouped = boardOrdering().groupActiveTasksBySection(world.tasks.tasks.value)
  return grouped[key].map((t: { name: string }) => t.name)
}

function boardHasTask(world: EnergyWorld, name: string): boolean {
  return (['now', 'next', 'later'] as const).some((k) => boardNames(world, k).includes(name))
}

function parseQuotedList(rawList: string): string[] {
  return rawList.split(',').map((entry) => entry.trim().replace(/^"|"$/g, ''))
}

Given('a fresh celebration session', function () {
  const c = celebration()
  c.dismissCelebration()
  if (c.confettiPieces.value.length > 0) {
    c.confettiPieces.value = []
  }
  const panel = completedPanel()
  if (panel.isOpen.value) {
    panel.close()
  }
  celebrationCountSnapshot = c.celebrationId.value
})

// Clear module-level timers so they never leak across scenarios or hold the process open.
After(function () {
  try {
    celebration().dismissCelebration()
    celebration().confettiPieces.value = []
  } catch {
    // module not present yet (red phase)
  }
})

Given('I have noted the celebration count', function () {
  celebrationCountSnapshot = celebration().celebrationId.value
})

// --- Completing from the board -------------------------------------------------

When('I complete the task {string} from the board', function (this: EnergyWorld, name: string) {
  celebration().toggleTaskDoneWithCelebration(taskId(this, name))
})

Given(
  'I have completed the task {string} from the board',
  function (this: EnergyWorld, name: string) {
    celebration().toggleTaskDoneWithCelebration(taskId(this, name))
  }
)

// --- Detail view ------------------------------------------------------------------

When("I toggle the task's done state from the detail view", function (this: EnergyWorld) {
  this.taskDetail.toggleDone()
})

Then('no discard confirmation should be showing in the detail view', function (this: EnergyWorld) {
  assert.equal(this.taskDetail.isDiscardConfirmOpen.value, false)
})

// --- Completed panel ----------------------------------------------------------------

When('I open the Completed panel', function () {
  completedPanel().open()
})

Given('I have opened the Completed panel', function () {
  completedPanel().open()
})

Given(
  'I have opened {string} from the Completed panel',
  function (this: EnergyWorld, name: string) {
    completedPanel().openTask(taskId(this, name))
  }
)

When(
  'I mark {string} as not done from the Completed panel',
  function (this: EnergyWorld, name: string) {
    completedPanel().uncomplete(taskId(this, name))
  }
)

// --- Assertions -----------------------------------------------------------------------

Then('the task {string} should not be on the board', function (this: EnergyWorld, name: string) {
  assert.equal(boardHasTask(this, name), false, `"${name}" is still on the board`)
})

Then(
  'the task {string} should be on the board in {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    const key = sectionLabel.toLowerCase() as 'now' | 'next' | 'later'
    assert.ok(boardNames(this, key).includes(name), `"${name}" not on the board in ${sectionLabel}`)
  }
)

Then('a celebration message should be showing', function () {
  const message = celebration().celebrationMessage.value
  assert.equal(typeof message, 'string')
  assert.ok(message.length > 0)
})

Then('the Completed count should be {int}', function (expected: number) {
  assert.equal(completedPanel().completedCount.value, expected)
})

Then(/^the Completed panel should list, most recent first: (.+)$/, function (rawList: string) {
  const actual = completedPanel().completedTasks.value.map((t: { name: string }) => t.name)
  assert.deepEqual(actual, parseQuotedList(rawList))
})

Then('the Completed panel should list no tasks', function () {
  assert.equal(completedPanel().completedTasks.value.length, 0)
})

Then('the Completed panel should be open', function () {
  assert.equal(completedPanel().isOpen.value, true)
})

Then('no new celebration should have been triggered', function () {
  assert.equal(celebration().celebrationId.value, celebrationCountSnapshot)
})

Then('a new celebration should have been triggered', function () {
  assert.ok(celebration().celebrationId.value > celebrationCountSnapshot)
})
