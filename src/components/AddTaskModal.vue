<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useAddTaskModal } from '../composables/useAddTaskModal'
import { useFocusTrap } from '../composables/useFocusTrap'
import { SECTION_DEFS } from '../composables/useSectionCollapse'
import { ENERGY_LEVEL_OPTIONS } from '../composables/useEnergyLevel'
import CloseConfirmDialog from './CloseConfirmDialog.vue'

const {
  isOpen,
  isConfirmOpen,
  taskName,
  nowNextLater,
  description,
  energyLevel,
  estimateDays,
  estimateHours,
  estimateMinutes,
  availableFrom,
  dueBy,
  subTasks,
  isSubTaskInputOpen,
  subTaskDraft,
  taskNameInvalid,
  dueByInvalid,
  canSaveSubTaskDraft,
  requestClose,
  selectSection,
  selectEnergyLevel,
  openSubTaskInput,
  closeSubTaskInput,
  saveSubTaskDraft,
  removeSubTask,
  setEstimateField,
  save,
} = useAddTaskModal()

const contentRef = ref<HTMLElement | null>(null)
const taskNameInputRef = ref<HTMLInputElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

const { handleKeydown } = useFocusTrap(contentRef)

function onTrapKeydown(event: KeyboardEvent) {
  if (isConfirmOpen.value) {
    return
  }
  handleKeydown(event)
}

// The component's own root is v-if="isOpen"-gated, AND App.vue also gates the <AddTaskModal />
// usage itself on isOpen, so the component instance is genuinely (re)created on every open, not
// just the first one ever (see App.vue). onMounted() therefore fires on every real open.
onMounted(() => {
  nextTick(() => {
    // Guards against the (unusual, but exercised at the unit-test layer, #116) case where
    // isConfirmOpen is already true at the moment this component mounts: CloseConfirmDialog's own
    // onMounted() (a child, mounted before this parent's onMounted per Vue's mount order) is
    // responsible for focus in that case, so this must not steal it back to Task name.
    if (!isConfirmOpen.value) {
      taskNameInputRef.value?.focus()
    }
  })
})

// This component stays mounted across the confirm-dialog sub-flow, so this genuinely is a
// watcher (Req 28): when the confirmation dialog closes without closing the Add Task modal,
// focus returns to the X button.
watch(isConfirmOpen, (confirmOpen, wasConfirmOpen) => {
  if (wasConfirmOpen && !confirmOpen) {
    closeButtonRef.value?.focus()
  }
})

function handleSave() {
  const result = save()
  if (!result) {
    nextTick(() => {
      taskNameInputRef.value?.focus()
    })
  }
}

function handleEstimateInput(field: 'days' | 'hours' | 'minutes', event: Event) {
  const target = event.target as HTMLInputElement
  setEstimateField(field, target.value)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="add-task-overlay"
    tabindex="-1"
    @click.self="requestClose"
    @keydown.esc="requestClose"
    @keydown="onTrapKeydown"
  >
    <div
      ref="contentRef"
      class="add-task-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-heading"
    >
      <div class="add-task-header">
        <h2 id="add-task-modal-heading">Add Task</h2>
      </div>

      <div class="field">
        <label for="task-name">Task name</label>
        <input
          id="task-name"
          ref="taskNameInputRef"
          v-model="taskName"
          type="text"
          required
          :aria-invalid="taskNameInvalid ? 'true' : undefined"
          :aria-describedby="taskNameInvalid ? 'task-name-error' : undefined"
        />
        <p v-if="taskNameInvalid" id="task-name-error" role="alert" class="field-error">
          Task name is required.
        </p>
      </div>

      <button
        ref="closeButtonRef"
        type="button"
        class="close-button"
        aria-label="Close"
        @click="requestClose"
      >
        <span aria-hidden="true">&times;</span>
      </button>

      <div class="field">
        <span id="task-section-label" class="group-label">Now/Next/Later</span>
        <div class="option-group" role="group" aria-labelledby="task-section-label">
          <button
            v-for="section in SECTION_DEFS"
            :key="section.key"
            type="button"
            class="option-button"
            :class="{ selected: nowNextLater === section.key }"
            :aria-pressed="nowNextLater === section.key"
            @click="selectSection(section.key)"
          >
            {{ section.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <label for="task-description">Description</label>
        <textarea id="task-description" v-model="description"></textarea>
      </div>

      <div class="field">
        <span id="task-energy-level-label" class="group-label">Energy level</span>
        <div class="option-group" role="group" aria-labelledby="task-energy-level-label">
          <button
            v-for="option in ENERGY_LEVEL_OPTIONS"
            :key="option.value"
            type="button"
            class="option-button"
            :class="{ selected: energyLevel === option.value }"
            :aria-pressed="energyLevel === option.value"
            @click="selectEnergyLevel(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <span id="task-estimate-label" class="group-label">Estimate</span>
        <div class="estimate-group" role="group" aria-labelledby="task-estimate-label">
          <div class="estimate-field">
            <label for="task-estimate-days">Estimate: days</label>
            <input
              id="task-estimate-days"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :value="estimateDays"
              @input="handleEstimateInput('days', $event)"
            />
          </div>
          <div class="estimate-field">
            <label for="task-estimate-hours">Estimate: hours</label>
            <input
              id="task-estimate-hours"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :value="estimateHours"
              @input="handleEstimateInput('hours', $event)"
            />
          </div>
          <div class="estimate-field">
            <label for="task-estimate-minutes">Estimate: minutes</label>
            <input
              id="task-estimate-minutes"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              :value="estimateMinutes"
              @input="handleEstimateInput('minutes', $event)"
            />
          </div>
        </div>
      </div>

      <div class="field">
        <label for="task-available-from">Available from</label>
        <input id="task-available-from" v-model="availableFrom" type="date" />
      </div>

      <div class="field">
        <label for="task-due-by">Due by</label>
        <input
          id="task-due-by"
          v-model="dueBy"
          type="date"
          :aria-invalid="dueByInvalid ? 'true' : undefined"
          :aria-describedby="dueByInvalid ? 'task-due-by-error' : undefined"
        />
        <p v-if="dueByInvalid" id="task-due-by-error" role="alert" class="field-error">
          Due by must be on or after Available from.
        </p>
      </div>

      <div class="field sub-tasks-section">
        <div class="sub-tasks-header">
          <span id="task-sub-tasks-label" class="group-label">Sub-tasks</span>
          <button
            type="button"
            class="add-sub-task-button"
            aria-label="Add sub-task"
            @click="openSubTaskInput"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        <div v-if="isSubTaskInputOpen" class="sub-task-draft">
          <label for="sub-task-draft">New sub-task</label>
          <input id="sub-task-draft" v-model="subTaskDraft" type="text" />
          <div class="sub-task-draft-actions">
            <button
              type="button"
              class="sub-task-save-button"
              :disabled="!canSaveSubTaskDraft"
              @click="saveSubTaskDraft"
            >
              Save
            </button>
            <button type="button" class="sub-task-close-button" @click="closeSubTaskInput">
              Close<span class="visually-hidden"> sub-task text</span>
            </button>
          </div>
        </div>

        <ul v-if="subTasks.length > 0" class="sub-task-list">
          <li v-for="subTask in subTasks" :key="subTask.id" class="sub-task-item">
            <span>{{ subTask.text }}</span>
            <button
              type="button"
              class="delete-sub-task-button"
              :aria-label="`Delete sub-task: ${subTask.text}`"
              @click="removeSubTask(subTask.id)"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="save-row">
        <button type="button" class="save-button" @click="handleSave">Save</button>
      </div>

      <CloseConfirmDialog v-if="isConfirmOpen" />
    </div>
  </div>
</template>

<style scoped>
.add-task-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
}

.add-task-content {
  position: relative;
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1a1a1a;
}

.add-task-header {
  margin-bottom: 1rem;
  padding-right: 2rem;
}

.add-task-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

/* Positioned absolutely (rather than a flex sibling of the heading) so the X button can sit later
   in DOM/tab order — after Task name, before Save is the last stop (see the e2e focus-trap test) —
   while staying visually pinned to the dialog's top-right corner. */
.close-button {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  color: #1a1a1a;
  padding: 0.25rem;
}

.field {
  margin-bottom: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label,
.group-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #595959;
}

.field input[type='text'],
.field input[type='date'],
.field input[type='number'],
.field textarea {
  font-size: 0.95rem;
  padding: 0.5rem 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid #d6d6d6;
  color: #1a1a1a;
  font-family: inherit;
}

.field-error {
  margin: 0;
  color: #767676;
  font-size: 0.85rem;
}

.option-group {
  display: flex;
  gap: 0.5rem;
}

.option-button {
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.option-button.selected {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}

.estimate-group {
  display: flex;
  gap: 0.75rem;
}

.estimate-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.estimate-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #595959;
}

.sub-tasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-sub-task-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.sub-task-draft {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.sub-task-draft-actions {
  display: flex;
  gap: 0.5rem;
}

.sub-task-save-button,
.sub-task-close-button {
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 0.4rem;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.sub-task-save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sub-task-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sub-task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e2e2;
  border-radius: 0.4rem;
}

.delete-sub-task-button {
  background: none;
  border: none;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #1a1a1a;
  padding: 0.2rem 0.4rem;
}

.save-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.save-button {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.55rem 1.3rem;
  border-radius: 0.4rem;
  border: 1px solid #1a1a1a;
  background: #1a1a1a;
  color: #fff;
  cursor: pointer;
}

@media (max-width: 640px) {
  .add-task-content {
    max-width: none;
    width: 100%;
    max-height: 100vh;
    height: 100%;
    border-radius: 0;
  }

  .close-button {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .add-sub-task-button {
    min-height: 44px;
    min-width: 44px;
  }

  .option-button {
    min-height: 44px;
    min-width: 44px;
  }

  .delete-sub-task-button {
    min-height: 44px;
    min-width: 44px;
  }

  .save-button {
    width: 100%;
    min-height: 44px;
  }

  .sub-task-save-button,
  .sub-task-close-button {
    min-height: 44px;
  }
}
</style>
