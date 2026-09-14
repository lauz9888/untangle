import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'node:assert/strict'
import type { EnergyWorld } from '../support/world'
import type { EnergyLevel } from '../../src/composables/useEnergyLevel'

Given('a fresh session', function (this: EnergyWorld) {
  if (this.energy.selectedLevel.value !== null) {
    this.energy.selectLevel(this.energy.selectedLevel.value)
  }
  this.energy.dismissToast()

  // `addTaskModal` is a true module-level singleton (like `energy`, unlike
  // `sections`), so state otherwise leaks across scenarios within the same
  // Cucumber process. `openModal()` unconditionally resets every field
  // (Requirement 34), and `confirmDiscard()` resets fields again and closes
  // both dialogs — running both, regardless of the modal's current state,
  // guarantees a fully closed, fully reset composable at the start of every
  // scenario without needing an unexported `resetFields()` action.
  if (this.addTaskModal.isConfirmOpen.value) {
    this.addTaskModal.cancelDiscard()
  }
  this.addTaskModal.openModal()
  this.addTaskModal.confirmDiscard()
})

Given(
  'I have selected the {string} energy level',
  function (this: EnergyWorld, level: EnergyLevel) {
    this.energy.selectLevel(level)
  }
)

When(
  /^I select the "([^"]+)" energy level(?: again)?$/,
  function (this: EnergyWorld, level: EnergyLevel) {
    this.energy.selectLevel(level)
  }
)

When('I click {string}', function (this: EnergyWorld, buttonLabel: string) {
  if (buttonLabel === 'Encourage me') {
    this.energy.encourageMe()
  } else if (buttonLabel === 'Tough love') {
    this.energy.toughLove()
  } else {
    throw new Error(`No step wiring for button "${buttonLabel}"`)
  }
})

When('I dismiss the toast manually', function (this: EnergyWorld) {
  this.energy.dismissToast()
})

Then(
  'the selected energy level should be {string}',
  function (this: EnergyWorld, level: EnergyLevel) {
    assert.equal(this.energy.selectedLevel.value, level)
  }
)

Then('no energy level should be selected', function (this: EnergyWorld) {
  assert.equal(this.energy.selectedLevel.value, null)
})

Then('a toast message should be showing', function (this: EnergyWorld) {
  assert.notEqual(this.energy.toastMessage.value, null)
  assert.ok((this.energy.toastMessage.value as string).length > 0)
})

Then('no toast should be showing', function (this: EnergyWorld) {
  assert.equal(this.energy.toastMessage.value, null)
})
