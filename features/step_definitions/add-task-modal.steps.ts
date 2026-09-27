import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import { SECTION_DEFS, type SectionKey } from '../../src/composables/useSectionCollapse'

// Drives useAddTaskModal() directly — the same singleton instance the
// AddTaskButton/AddTaskModal/CloseConfirmDialog components share — rather
// than reaching into implementation details, matching the convention
// established by energy.steps.ts/task-store.steps.ts. Scenarios cover
// only the behaviors design.md assigns to the BDD layer; per-field exhaustive
// sanitization/validation coverage lives in tests/unit/add-task-modal/.

const SECTION_KEYS_BY_LABEL: Record<string, SectionKey> = Object.fromEntries(
  SECTION_DEFS.map((def) => [def.label, def.key])
)

function keyForLabel(label: string): SectionKey {
  const key = SECTION_KEYS_BY_LABEL[label]
  if (!key) {
    throw new Error(`No Now/Next/Later section named "${label}"`)
  }
  return key
}

// --- Opening/closing the modal -------------------------------------------

Given('I have opened the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.openModal()
})

When('I open the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.openModal()
})

Given('I have requested to close the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.requestClose()
})

When('I confirm discarding the draft', function (this: EnergyWorld) {
  this.addTaskModal.confirmDiscard()
})

Given('I confirmed discarding the draft', function (this: EnergyWorld) {
  this.addTaskModal.confirmDiscard()
})

When('I cancel discarding the draft', function (this: EnergyWorld) {
  this.addTaskModal.cancelDiscard()
})

// --- Simple text/date fields (plain refs, driven directly like v-model) ----

Given('I have entered {string} as the task name', function (this: EnergyWorld, value: string) {
  this.addTaskModal.taskName.value = value
})

When('I set the available from date to {string}', function (this: EnergyWorld, value: string) {
  this.addTaskModal.availableFrom.value = value
})

When('I set the due by date to {string}', function (this: EnergyWorld, value: string) {
  this.addTaskModal.dueBy.value = value
})

// --- Save ---------------------------------------------------------------------

When('I save the new task', function (this: EnergyWorld) {
  this.addTaskModal.save()
})

Given('I have attempted to save the new task', function (this: EnergyWorld) {
  this.addTaskModal.save()
})

// --- Assertions -----------------------------------------------------------

Then('the Add Task modal should be open', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isOpen.value, true)
})

Then('the Add Task modal should be closed', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isOpen.value, false)
})

Then('no close confirmation should be showing', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isConfirmOpen.value, false)
})

Then(
  'the Now\\/Next\\/Later selection should be {string}',
  function (this: EnergyWorld, label: string) {
    assert.equal(this.addTaskModal.nowNextLater.value, keyForLabel(label))
  }
)

Then('the task name should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.taskName.value, '')
})

Then('the task name should be {string}', function (this: EnergyWorld, expected: string) {
  assert.equal(this.addTaskModal.taskName.value, expected)
})

Then('the description should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.description.value, '')
})

Then('no energy level should be selected for the new task', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.energyLevel.value, null)
})

Then('every estimate field should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.estimateDays.value, '')
  assert.equal(this.addTaskModal.estimateHours.value, '')
  assert.equal(this.addTaskModal.estimateMinutes.value, '')
})

Then('the available from date should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.availableFrom.value, '')
})

Then('the due by date should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.dueBy.value, '')
})

Then('there should be no sub-tasks', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.subTasks.value.length, 0)
})
