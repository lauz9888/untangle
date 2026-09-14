import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import type { EnergyLevel } from '../../src/composables/useEnergyLevel'
import { SECTION_DEFS, type SectionKey } from '../../src/composables/useSectionCollapse'

// Drives useAddTaskModal() directly — the same singleton instance the
// AddTaskButton/AddTaskModal/CloseConfirmDialog components share — rather
// than reaching into implementation details, matching the convention
// established by energy.steps.ts/section-collapse.steps.ts. Scenarios cover
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

type EstimateField = 'days' | 'hours' | 'minutes'

function assertEstimateField(field: string): asserts field is EstimateField {
  if (field !== 'days' && field !== 'hours' && field !== 'minutes') {
    throw new Error(`No estimate field named "${field}"`)
  }
}

function findSubTaskId(world: EnergyWorld, text: string): number {
  const match = world.addTaskModal.subTasks.value.find((subTask) => subTask.text === text)
  if (!match) {
    throw new Error(`No sub-task with text "${text}" exists`)
  }
  return match.id
}

// --- Opening/closing the modal -------------------------------------------

Given('I have opened the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.openModal()
})

When('I open the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.openModal()
})

When('I request to close the Add Task modal', function (this: EnergyWorld) {
  this.addTaskModal.requestClose()
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

// --- Now/Next/Later ---------------------------------------------------------

When('I select {string} for the new task', function (this: EnergyWorld, label: string) {
  this.addTaskModal.selectSection(keyForLabel(label))
})

Given('I have selected {string} for the new task', function (this: EnergyWorld, label: string) {
  this.addTaskModal.selectSection(keyForLabel(label))
})

// --- Simple text/date fields (plain refs, driven directly like v-model) ----

When('I enter {string} as the task name', function (this: EnergyWorld, value: string) {
  this.addTaskModal.taskName.value = value
})

Given('I have entered {string} as the task name', function (this: EnergyWorld, value: string) {
  this.addTaskModal.taskName.value = value
})

When('I enter {string} as the description', function (this: EnergyWorld, value: string) {
  this.addTaskModal.description.value = value
})

When('I set the available from date to {string}', function (this: EnergyWorld, value: string) {
  this.addTaskModal.availableFrom.value = value
})

When('I set the due by date to {string}', function (this: EnergyWorld, value: string) {
  this.addTaskModal.dueBy.value = value
})

// --- Energy level (modal's own local field, not the header singleton) ------

When(
  'I select the {string} energy level for the new task',
  function (this: EnergyWorld, level: string) {
    this.addTaskModal.selectEnergyLevel(level as EnergyLevel)
  }
)

// --- Estimate sub-fields -----------------------------------------------------

When(
  'I set the estimate {word} field to {string}',
  function (this: EnergyWorld, field: string, rawValue: string) {
    assertEstimateField(field)
    this.addTaskModal.setEstimateField(field, rawValue)
  }
)

Then(
  'the estimate {word} field should read {string}',
  function (this: EnergyWorld, field: string, expected: string) {
    assertEstimateField(field)
    const refs = {
      days: this.addTaskModal.estimateDays,
      hours: this.addTaskModal.estimateHours,
      minutes: this.addTaskModal.estimateMinutes,
    }
    assert.equal(refs[field].value, expected)
  }
)

// --- Sub-tasks ---------------------------------------------------------------

Given('I have opened the sub-task input', function (this: EnergyWorld) {
  this.addTaskModal.openSubTaskInput()
})

When('I open the sub-task input', function (this: EnergyWorld) {
  this.addTaskModal.openSubTaskInput()
})

Given('I have closed the sub-task input without saving', function (this: EnergyWorld) {
  this.addTaskModal.closeSubTaskInput()
})

When(
  'I type {string} into the sub-task input without saving',
  function (this: EnergyWorld, text: string) {
    this.addTaskModal.openSubTaskInput()
    this.addTaskModal.subTaskDraft.value = text
  }
)

Given(
  'I have typed {string} into the sub-task input without saving',
  function (this: EnergyWorld, text: string) {
    this.addTaskModal.openSubTaskInput()
    this.addTaskModal.subTaskDraft.value = text
  }
)

When(
  'I attempt to save the sub-task draft with text {string}',
  function (this: EnergyWorld, text: string) {
    this.addTaskModal.subTaskDraft.value = text
    this.addTaskModal.saveSubTaskDraft()
  }
)

When('I add the sub-task {string}', function (this: EnergyWorld, text: string) {
  this.addTaskModal.openSubTaskInput()
  this.addTaskModal.subTaskDraft.value = text
  this.addTaskModal.saveSubTaskDraft()
})

Given('I have added the sub-task {string}', function (this: EnergyWorld, text: string) {
  this.addTaskModal.openSubTaskInput()
  this.addTaskModal.subTaskDraft.value = text
  this.addTaskModal.saveSubTaskDraft()
})

When('I delete the sub-task {string}', function (this: EnergyWorld, text: string) {
  this.addTaskModal.removeSubTask(findSubTaskId(this, text))
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

Then('the close confirmation should be showing', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isConfirmOpen.value, true)
})

Then('no close confirmation should be showing', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isConfirmOpen.value, false)
})

Then(
  'the Now/Next/Later selection should be {string}',
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

Then('the task name should be marked invalid', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.taskNameInvalid.value, true)
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

Then('the due by date should be marked invalid', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.dueByInvalid.value, true)
})

Then('there should be no sub-tasks', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.subTasks.value.length, 0)
})

Then('the sub-task input should still be open', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.isSubTaskInputOpen.value, true)
})

Then('the sub-task draft text should be empty', function (this: EnergyWorld) {
  assert.equal(this.addTaskModal.subTaskDraft.value, '')
})

Then(/^the sub-tasks should be, in order: (.+)$/, function (this: EnergyWorld, rawList: string) {
  const expected = rawList.split(',').map((entry) => entry.trim().replace(/^"|"$/g, ''))
  const actual = this.addTaskModal.subTasks.value.map((subTask) => subTask.text)
  assert.deepEqual(actual, expected)
})
