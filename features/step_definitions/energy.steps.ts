import { Given } from '@cucumber/cucumber'
import type { EnergyWorld } from '../support/world'

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

  // `tasks` is also a true module-level singleton (like `energy`/
  // `addTaskModal`), so its state otherwise leaks across scenarios within the
  // same Cucumber process. There's no dedicated reset-all export, so this
  // uses the store's own already-public `removeTask` API against a snapshot
  // of the current list (mutating `tasks.value` while iterating it directly
  // would skip entries).
  for (const task of [...this.tasks.tasks.value]) {
    this.tasks.removeTask(task.id)
  }
})
