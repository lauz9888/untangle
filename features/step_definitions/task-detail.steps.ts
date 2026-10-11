import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import { SECTION_DEFS, type SectionKey } from '../../src/composables/useSectionCollapse'
import { ENERGY_LEVEL_OPTIONS, type EnergyLevel } from '../../src/composables/useEnergyLevel'

// Drives useTaskDetail() directly — the same singleton instance
// NowNextLaterBoard.vue (trigger), TaskDetailModal.vue, and its nested
// confirmation dialogs share — rather than reaching into implementation
// details, matching the convention established by
// add-task-modal.steps.ts/task-store.steps.ts. Scenarios cover only the
// multi-step, cross-the-full-slice journeys design.md's Test impact section
// assigns to the BDD layer (full-field pre-fill, edit-and-save reflected on
// the board, delete-through-confirmation, discard-then-reopen, and
// done-toggle-survives-discard) — per-field exhaustive coverage lives in
// tests/unit/task-detail/.

const SECTION_KEYS_BY_LABEL: Record<string, SectionKey> = Object.fromEntries(
  SECTION_DEFS.map((def) => [def.label, def.key])
)

const ENERGY_LEVELS_BY_LABEL: Record<string, EnergyLevel> = Object.fromEntries(
  ENERGY_LEVEL_OPTIONS.map((option) => [option.label, option.value])
)

function keyForLabel(label: string): SectionKey {
  const key = SECTION_KEYS_BY_LABEL[label]
  if (!key) {
    throw new Error(`No Now/Next/Later section named "${label}"`)
  }
  return key
}

function energyLevelForLabel(label: string): EnergyLevel {
  const level = ENERGY_LEVELS_BY_LABEL[label]
  if (!level) {
    throw new Error(`No energy level named "${label}"`)
  }
  return level
}

function parseQuotedList(rawList: string): string[] {
  return rawList.split(',').map((entry) => entry.trim().replace(/^"|"$/g, ''))
}

function findTaskIdByName(world: EnergyWorld, name: string): number {
  const task = world.tasks.tasks.value.find((t) => t.name === name)
  assert.ok(task, `No task named "${name}" found in the store`)
  return task!.id
}

// --- Opening the detail view -------------------------------------------------

Given('I have opened the detail view for {string}', function (this: EnergyWorld, name: string) {
  this.taskDetail.open(findTaskIdByName(this, name))
})

When('I open the detail view for {string}', function (this: EnergyWorld, name: string) {
  this.taskDetail.open(findTaskIdByName(this, name))
})

// --- Editing draft fields (plain refs/functions, driven directly like v-model) ----

Given(
  "I have set the detail view's task name to {string}",
  function (this: EnergyWorld, value: string) {
    this.taskDetail.name.value = value
  }
)

Given(
  "I have set the detail view's description to {string}",
  function (this: EnergyWorld, value: string) {
    this.taskDetail.description.value = value
  }
)

Given(
  "I have selected {string} as the detail view's section",
  function (this: EnergyWorld, label: string) {
    this.taskDetail.selectSection(keyForLabel(label))
  }
)

// --- Done toggling ------------------------------------------------------------

Given("I have toggled the task's done state from the detail view", function (this: EnergyWorld) {
  this.taskDetail.toggleDone()
})

// --- Save ---------------------------------------------------------------------

When('I save the detail view', function (this: EnergyWorld) {
  this.taskDetail.save()
})

// --- Closing / discarding -------------------------------------------------------

Given('I have requested to close the detail view', function (this: EnergyWorld) {
  this.taskDetail.requestClose()
})

When("I confirm discarding the detail view's changes", function (this: EnergyWorld) {
  this.taskDetail.confirmDiscard()
})

// --- Delete ---------------------------------------------------------------------

Given('I have requested to delete the task from the detail view', function (this: EnergyWorld) {
  this.taskDetail.requestDelete()
})

When('I confirm deleting the task', function (this: EnergyWorld) {
  this.taskDetail.confirmDelete()
})

// --- Assertions -----------------------------------------------------------------

Then('the detail view should be open for {string}', function (this: EnergyWorld, name: string) {
  assert.equal(this.taskDetail.isOpen.value, true)
  assert.equal(this.taskDetail.name.value, name)
})

Then('the detail view should be closed', function (this: EnergyWorld) {
  assert.equal(this.taskDetail.isOpen.value, false)
})

Then(
  "the detail view's section selection should be {string}",
  function (this: EnergyWorld, label: string) {
    assert.equal(this.taskDetail.section.value, keyForLabel(label))
  }
)

Then(
  "the detail view's description should be {string}",
  function (this: EnergyWorld, expected: string) {
    assert.equal(this.taskDetail.description.value, expected)
  }
)

Then(
  "the detail view's energy level selection should be {string}",
  function (this: EnergyWorld, label: string) {
    assert.equal(this.taskDetail.energyLevel.value, energyLevelForLabel(label))
  }
)

Then(
  "the detail view's estimate fields should be {string} days, {string} hours, {string} minutes",
  function (this: EnergyWorld, days: string, hours: string, minutes: string) {
    assert.equal(this.taskDetail.estimateDays.value, days)
    assert.equal(this.taskDetail.estimateHours.value, hours)
    assert.equal(this.taskDetail.estimateMinutes.value, minutes)
  }
)

Then(
  "the detail view's available from date should be {string}",
  function (this: EnergyWorld, expected: string) {
    assert.equal(this.taskDetail.availableFrom.value, expected)
  }
)

Then(
  "the detail view's due by date should be {string}",
  function (this: EnergyWorld, expected: string) {
    assert.equal(this.taskDetail.dueBy.value, expected)
  }
)

Then(
  /^the detail view's sub-tasks should be, in order: (.+)$/,
  function (this: EnergyWorld, rawList: string) {
    const expected = parseQuotedList(rawList)
    const actual = this.taskDetail.subTasks.value.map((subTask) => subTask.text)
    assert.deepEqual(actual, expected)
  }
)
