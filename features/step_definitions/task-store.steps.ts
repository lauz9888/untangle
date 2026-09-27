import { Given, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import { SECTION_DEFS, type SectionKey } from '../../src/composables/useSectionCollapse'

// Drives useTasks() directly — the same singleton instance AddTaskModal.vue
// (writer) and NowNextLaterBoard.vue (reader) share — rather than reaching
// into implementation details, matching the convention established by
// energy.steps.ts/add-task-modal.steps.ts. Scenarios cover only the
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

// --- Adding tasks -----------------------------------------------------------

Given(
  'I have added a task named {string} to {string}',
  function (this: EnergyWorld, name: string, sectionLabel: string) {
    this.tasks.addTask({ name, section: keyForLabel(sectionLabel) })
  }
)

// --- Assertions --------------------------------------------------------------

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
