<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useTaskDetail } from '../composables/useTaskDetail'
import { useFocusTrap } from '../composables/useFocusTrap'
import { SECTION_DEFS } from '../composables/useSectionCollapse'
import { ENERGY_LEVEL_OPTIONS } from '../composables/useEnergyLevel'
import TaskDetailDiscardDialog from './TaskDetailDiscardDialog.vue'
import TaskDetailDeleteDialog from './TaskDetailDeleteDialog.vue'

const {
  isOpen,
  isDiscardConfirmOpen,
  isDeleteConfirmOpen,
  name,
  section,
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
  nameInvalid,
  storedTask,
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
  toggleDone,
  toggleSubTaskDoneInView,
  requestDelete,
  save,
} = useTaskDetail()

const contentRef = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const deleteButtonRef = ref<HTMLButtonElement | null>(null)

const { handleKeydown } = useFocusTrap(contentRef)

function onTrapKeydown(event: KeyboardEvent) {
  if (isDiscardConfirmOpen.value || isDeleteConfirmOpen.value) {
    return
  }
  handleKeydown(event)
}

onMounted(() => {
  nextTick(() => {
    if (!isDiscardConfirmOpen.value && !isDeleteConfirmOpen.value) {
      nameInputRef.value?.focus()
    }
  })
})

watch(isDiscardConfirmOpen, (confirmOpen, wasConfirmOpen) => {
  if (wasConfirmOpen && !confirmOpen) {
    closeButtonRef.value?.focus()
  }
})

watch(isDeleteConfirmOpen, (confirmOpen, wasConfirmOpen) => {
  if (wasConfirmOpen && !confirmOpen) {
    deleteButtonRef.value?.focus()
  }
})

function handleSave() {
  const result = save()
  if (!result) {
    nextTick(() => {
      nameInputRef.value?.focus()
    })
  }
}

function handleEstimateInput(field: 'days' | 'hours' | 'minutes', event: Event) {
  const target = event.target as HTMLInputElement
  setEstimateField(field, target.value)
}

function isSubTaskDone(id: number): boolean {
  return storedTask.value?.subTasks.find((s) => s.id === id)?.done ?? false
}
</script>

<template>
  <div
    v-if="isOpen"
    class="task-detail-overlay"
    tabindex="-1"
    @click.self="requestClose"
    @keydown.esc="requestClose"
    @keydown="onTrapKeydown"
  >
    <div
      ref="contentRef"
      class="task-detail-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-heading"
    >
      <div class="task-detail-header">
        <h2 id="task-detail-heading">Edit Task</h2>
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

      <div class="field field-done">
        <input
          id="task-detail-done"
          type="checkbox"
          :checked="storedTask?.done ?? false"
          @change="toggleDone()"
        />
        <label for="task-detail-done">Mark as done</label>
      </div>

      <div class="field">
        <label for="task-detail-name">Task name</label>
        <input
          id="task-detail-name"
          ref="nameInputRef"
          v-model="name"
          type="text"
          required
          :aria-invalid="nameInvalid ? 'true' : undefined"
          :aria-describedby="nameInvalid ? 'task-detail-name-error' : undefined"
        />
        <p v-if="nameInvalid" id="task-detail-name-error" role="alert" class="field-error">
          Task name is required.
        </p>
      </div>

      <div class="field">
        <span id="task-detail-section-label" class="group-label">Now/Next/Later</span>
        <div class="option-group" role="group" aria-labelledby="task-detail-section-label">
          <button
            v-for="sectionDef in SECTION_DEFS"
            :key="sectionDef.key"
            type="button"
            class="option-button"
            :class="{ selected: section === sectionDef.key }"
            :aria-pressed="section === sectionDef.key"
            @click="selectSection(sectionDef.key)"
          >
            {{ sectionDef.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <label for="task-detail-description">Description</label>
        <textarea id="task-detail-description" v-model="description"></textarea>
      </div>

      <div class="field">
        <span id="task-detail-energy-level-label" class="group-label">Energy level</span>
        <div class="option-group" role="group" aria-labelledby="task-detail-energy-level-label">
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

      <div class="field field-estimate">
        <span id="task-detail-estimate-label" class="group-label">Estimate</span>
        <div class="estimate-group" role="group" aria-labelledby="task-detail-estimate-label">
          <div class="estimate-field">
            <label for="task-detail-estimate-days">Days</label>
            <input
              id="task-detail-estimate-days"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              class="estimate-input"
              :value="estimateDays"
              @input="handleEstimateInput('days', $event)"
            />
          </div>
          <div class="estimate-field">
            <label for="task-detail-estimate-hours">Hrs</label>
            <input
              id="task-detail-estimate-hours"
              type="number"
              min="0"
              max="23"
              step="1"
              inputmode="numeric"
              class="estimate-input"
              :value="estimateHours"
              @input="handleEstimateInput('hours', $event)"
            />
          </div>
          <div class="estimate-field">
            <label for="task-detail-estimate-minutes">Min</label>
            <input
              id="task-detail-estimate-minutes"
              type="number"
              min="0"
              max="59"
              step="1"
              inputmode="numeric"
              class="estimate-input"
              :value="estimateMinutes"
              @input="handleEstimateInput('minutes', $event)"
            />
          </div>
        </div>
      </div>

      <div class="field">
        <label for="task-detail-available-from">Available from</label>
        <input id="task-detail-available-from" v-model="availableFrom" type="date" />
      </div>

      <div class="field">
        <label for="task-detail-due-by">Due by</label>
        <input
          id="task-detail-due-by"
          v-model="dueBy"
          type="date"
          :aria-invalid="dueByInvalid ? 'true' : undefined"
          :aria-describedby="dueByInvalid ? 'task-detail-due-by-error' : undefined"
        />
        <p v-if="dueByInvalid" id="task-detail-due-by-error" role="alert" class="field-error">
          Due by must be on or after Available from.
        </p>
      </div>

      <div class="field sub-tasks-section">
        <div class="sub-tasks-header">
          <span id="task-detail-sub-tasks-label" class="group-label">Sub-tasks</span>
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
          <label for="task-detail-sub-task-draft">New sub-task</label>
          <input id="task-detail-sub-task-draft" v-model="subTaskDraft" type="text" />
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
          <li v-for="(item, index) in subTasks" :key="item.id" class="sub-task-item">
            <input
              v-model="item.text"
              type="text"
              class="sub-task-text-input"
              :aria-label="`Sub-task ${index + 1} text`"
            />
            <input
              v-if="!item.isNew"
              type="checkbox"
              :checked="isSubTaskDone(item.id)"
              :aria-label="`Mark sub-task '${item.text}' as done`"
              @change="toggleSubTaskDoneInView(item.id)"
            />
            <button
              type="button"
              class="delete-sub-task-button"
              :aria-label="`Delete sub-task: ${item.text}`"
              @click="removeSubTask(item.id)"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="save-row">
        <button
          ref="deleteButtonRef"
          type="button"
          class="delete-button"
          aria-label="Delete task"
          @click="requestDelete"
        >
          Delete
        </button>
        <button type="button" class="save-button" @click="handleSave">Save</button>
      </div>

      <TaskDetailDiscardDialog v-if="isDiscardConfirmOpen" />
      <TaskDetailDeleteDialog v-if="isDeleteConfirmOpen" />
    </div>
  </div>
</template>

<style scoped>
.task-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
}

.task-detail-content {
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

.task-detail-header {
  margin-bottom: 1rem;
  padding-right: 2rem;
}

.task-detail-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

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

.field-done {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.field-done label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #1a1a1a;
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

.field-estimate {
  margin-bottom: 0.7rem;
  gap: 0.3rem;
}

.estimate-group {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.6rem;
}

.estimate-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
}

.estimate-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #595959;
  white-space: nowrap;
  margin: 0;
}

.estimate-input {
  width: 3.25rem;
  flex: 0 0 auto;
  text-align: center;
  padding: 0.35rem 0.3rem;
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
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid #e2e2e2;
  border-radius: 0.4rem;
}

.sub-task-text-input {
  flex: 1 1 auto;
  min-width: 0;
}

.delete-sub-task-button {
  background: none;
  border: none;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: #1a1a1a;
  padding: 0.2rem 0.4rem;
  flex-shrink: 0;
}

.save-row {
  display: flex;
  justify-content: space-between;
  margin-top: 1.25rem;
  gap: 0.75rem;
}

.delete-button {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.55rem 1.3rem;
  border-radius: 0.4rem;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
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
  .task-detail-content {
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

  .field-done input[type='checkbox'] {
    min-height: 44px;
    min-width: 44px;
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

  .sub-task-item input[type='checkbox'] {
    min-height: 44px;
    min-width: 44px;
  }

  .save-button,
  .delete-button {
    min-height: 44px;
  }

  .save-row {
    flex-wrap: wrap;
  }

  .save-button,
  .delete-button {
    flex: 1 1 auto;
  }

  .sub-task-save-button,
  .sub-task-close-button {
    min-height: 44px;
  }

  .estimate-group {
    gap: 0.4rem;
  }

  .estimate-field {
    gap: 0.25rem;
  }

  .estimate-input {
    width: 3rem;
    min-height: 44px;
  }
}
</style>
