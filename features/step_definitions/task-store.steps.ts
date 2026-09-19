import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import { SECTION_DEFS, type SectionKey } from '../../src/composables/useSectionCollapse'

// Drives useTasks() directly — the same singleton instance AddTaskModal.vue
// (writer) and NowNextLaterBoard.vue (reader) share — rather than reaching
// into implementation details, matching the convention established by
// energy.steps.ts/add-task-modal.steps.ts. The two "Add Task modal" scenarios
// at the bottom of task-management.feature integrate this store with the
// existing modal steps from add-task-modal.steps.ts. Scenarios cover only the
// behaviors design.md assigns to the BDD layer; exhaustive field-by-field
// coverage of the store's CRUD/persistence rules lives in
// tests/unit/tasks/composable.test.ts.

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

function parseQuotedList(rawList: string): string[] {
  return rawList.split(',').map((entry) => entry.trim().replace(/^"|"$/g, ''))
}

function findTaskByName(world: EnergyWorld, name: string) {
  const match = world.tasks.tasks.value.find((task) => task.name === name)
  if (!match) {
    throw new Error(`No task named "${name}" exists in the store`)
  }
  return match
}

function findSubTaskByText(world: EnergyWorld, taskName: string, subTaskText: string) {
  const task = findTaskByName(world, taskName)
  const subTask = task.subTasks.find((s) => s.text === subTaskText)
  if (!subTask) {
    throw new Error(`No sub-task with text "${subTaskText}" exists on task "${taskName}"`)
  }
  return subTask
}

// --- Adding tasks -----------------------------------------------------------

When(
  'I add a task named {string} to {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel) })
  }
)

Given(
  'I have added a task named {string} to {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel) })
  }
)

When(
  'I attempt to add a task named {string} to {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel) })
  }
)

When(
  'I attempt to add a task named {string} to {string} available from {string} due by {string}',
  function (
    this: EnergyWorld,
    name: string,
    sectionLabel: string,
    availableFrom: string,
    dueBy: string
  ) {
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel), availableFrom, dueBy })
  }
)

Given(
  /^I have added a task named "([^"]+)" to "([^"]+)" with sub-tasks: (.+)$/,
  function (this: EnergyWorld, name: string, sectionLabel: string, rawList: string) {
    const subTasks = parseQuotedList(rawList).map((text) => ({ text }))
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel), subTasks })
  }
)

// --- Toggling ------------------------------------------------------------

When('I toggle the done state of task {string}', function (this: EnergyWorld, name: string) {
  const task = findTaskByName(this, name)
  this.tasks.toggleTaskDone(task.id)
})

When(
  'I toggle the done state of sub-task {string} on task {string}',
  function (this: EnergyWorld, subTaskText: string, taskName: string) {
    const task = findTaskByName(this, taskName)
    const subTask = findSubTaskByText(this, taskName, subTaskText)
    this.tasks.toggleSubTaskDone(task.id, subTask.id)
  }
)

// --- Removing --------------------------------------------------------------

When('I remove the task {string}', function (this: EnergyWorld, name: string) {
  const task = findTaskByName(this, name)
  this.tasks.removeTask(task.id)
})

When('I attempt to remove an unknown task', function (this: EnergyWorld) {
  this.tasks.removeTask(999999)
})

// --- Updating ----------------------------------------------------------------

When(
  'I update the task {string} to be named {string} in {string}',
  function (this: EnergyWorld, oldName: string, newName: string, sectionLabel: string) {
    const task = findTaskByName(this, oldName)
    this.tasks.updateTask(task.id, { name: newName, section: keyForLabel(sectionLabel) })
  }
)

When(
  'I attempt to update the task {string} to be named {string}',
  function (this: EnergyWorld, oldName: string, newName: string) {
    const task = findTaskByName(this, oldName)
    this.tasks.updateTask(task.id, { name: newName })
  }
)

// --- Assertions --------------------------------------------------------------

Then('the store should contain {int} task(s)', function (this: EnergyWorld, count: number) {
  assert.equal(this.tasks.tasks.value.length, count)
})

Then(
  'the store should contain a task named {string} in {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    const task = findTaskByName(this, name)
    assert.equal(task.section, keyForLabel(sectionLabel))
  }
)

Then('the task {string} should be done', function (this: EnergyWorld, name: string) {
  const task = findTaskByName(this, name)
  assert.equal(task.done, true)
})

Then('the task {string} should not be done', function (this: EnergyWorld, name: string) {
  const task = findTaskByName(this, name)
  assert.equal(task.done, false)
})

Then('the task {string} should still be present', function (this: EnergyWorld, name: string) {
  assert.ok(findTaskByName(this, name))
})

Then(
  'the sub-task {string} on task {string} should be done',
  function (this: EnergyWorld, subTaskText: string, taskName: string) {
    const subTask = findSubTaskByText(this, taskName, subTaskText)
    assert.equal(subTask.done, true)
  }
)

Then(
  'the sub-task {string} on task {string} should not be done',
  function (this: EnergyWorld, subTaskText: string, taskName: string) {
    const subTask = findSubTaskByText(this, taskName, subTaskText)
    assert.equal(subTask.done, false)
  }
)

Then(
  /^the tasks in "([^"]+)" should be, in order: (.+)$/,
  function (this: EnergyWorld, sectionLabel: string, rawList: string) {
    const expected = parseQuotedList(rawList)
    const key = keyForLabel(sectionLabel)
    const actual = this.tasks.tasks.value
      .filter((task) => task.section === key)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((task) => task.name)
    assert.deepEqual(actual, expected)
  }
)
