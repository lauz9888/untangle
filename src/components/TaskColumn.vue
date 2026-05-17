<script setup>
import { ref, computed } from 'vue'
import { useTasks } from '../composables/useTasks.js'
import { ENERGY_LEVELS, COLUMNS } from '../constants/energy.js'
import TaskCard from './TaskCard.vue'

const props = defineProps({
  column: { type: Object, required: true },
})

const { tasksForColumn, addTask, moveTaskToColumn } = useTasks()

const columnIndex = computed(() => COLUMNS.findIndex(c => c.id === props.column.id))
const isFirstColumn = computed(() => columnIndex.value === 0)
const isLastColumn = computed(() => columnIndex.value === COLUMNS.length - 1)

const showForm = ref(false)
const newTitle = ref('')
const newEnergy = ref(null)
const newDueDate = ref('')
const newAvailableFrom = ref('')
const pendingSubtasks = ref([])
const pendingSubtask = ref('')

function addPendingSubtask() {
  const trimmed = pendingSubtask.value.trim()
  if (!trimmed) return
  pendingSubtasks.value.push(trimmed)
  pendingSubtask.value = ''
}

function removePendingSubtask(index) {
  pendingSubtasks.value.splice(index, 1)
}

function submit() {
  const trimmed = newTitle.value.trim()
  if (!trimmed) return
  // Capture any subtask typed but not yet added
  if (pendingSubtask.value.trim()) addPendingSubtask()
  addTask(trimmed, props.column.id, {
    energy: newEnergy.value,
    dueDate: newDueDate.value || null,
    availableFrom: newAvailableFrom.value || null,
    subtasks: pendingSubtasks.value,
  })
  resetForm()
}

function cancel() {
  resetForm()
}

function resetForm() {
  newTitle.value = ''
  newEnergy.value = null
  newDueDate.value = ''
  newAvailableFrom.value = ''
  pendingSubtasks.value = []
  pendingSubtask.value = ''
  showForm.value = false
}

// Drag-and-drop
const isDragOver = ref(false)
let enterCount = 0

function onDragEnter() {
  enterCount++
  isDragOver.value = true
}

function onDragLeave() {
  enterCount--
  if (enterCount <= 0) {
    enterCount = 0
    isDragOver.value = false
  }
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e) {
  e.preventDefault()
  enterCount = 0
  isDragOver.value = false
  const taskId = e.dataTransfer.getData('text/plain')
  if (taskId) moveTaskToColumn(taskId, props.column.id)
}
</script>

<template>
  <div
    class="task-column"
    :class="{ 'drag-over': isDragOver }"
    :data-column="column.id"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <h2 class="column-header">{{ column.label }}</h2>
    <div class="task-list">
      <TaskCard
        v-for="task in tasksForColumn(column.id)"
        :key="task.id"
        :task="task"
        :is-first="isFirstColumn"
        :is-last="isLastColumn"
      />
      <p v-if="tasksForColumn(column.id).length === 0" class="empty-hint">No tasks yet</p>
    </div>
    <div class="add-task-area">
      <button v-if="!showForm" class="add-task-btn" @click="showForm = true">
        + Add task
      </button>
      <form v-else class="add-task-form" @submit.prevent="submit">
        <input
          v-model="newTitle"
          class="task-input"
          placeholder="Task name"
          autofocus
          required
        />

        <fieldset class="form-section">
          <legend class="form-section-label">Energy <span class="optional">optional</span></legend>
          <div class="energy-picker" role="group" aria-label="Energy level">
            <button
              type="button"
              class="energy-opt"
              :class="{ active: newEnergy === null }"
              @click="newEnergy = null"
            >None</button>
            <button
              v-for="level in ENERGY_LEVELS"
              :key="level.id"
              type="button"
              class="energy-opt"
              :class="[`energy-${level.id}`, { active: newEnergy === level.id }]"
              @click="newEnergy = level.id"
            >{{ level.label }}</button>
          </div>
        </fieldset>

        <div class="form-dates">
          <div class="form-date-field">
            <label class="form-section-label">Available from <span class="optional">optional</span></label>
            <input type="date" v-model="newAvailableFrom" class="date-input" />
          </div>
          <div class="form-date-field">
            <label class="form-section-label">Due date <span class="optional">optional</span></label>
            <input type="date" v-model="newDueDate" class="date-input" />
          </div>
        </div>

        <fieldset class="form-section">
          <legend class="form-section-label">Subtasks <span class="optional">optional</span></legend>
          <ul v-if="pendingSubtasks.length > 0" class="pending-subtasks">
            <li v-for="(s, i) in pendingSubtasks" :key="i" class="pending-subtask-item">
              <span>{{ s }}</span>
              <button type="button" class="subtask-remove-btn" @click="removePendingSubtask(i)" aria-label="Remove subtask">✕</button>
            </li>
          </ul>
          <div class="add-subtask-row">
            <input
              v-model="pendingSubtask"
              class="subtask-input"
              placeholder="Add a subtask"
              @keydown.enter.prevent="addPendingSubtask"
            />
            <button type="button" class="btn-subtle" @click="addPendingSubtask">Add</button>
          </div>
        </fieldset>

        <div class="form-footer">
          <button type="submit" class="btn-primary">Add task</button>
          <button type="button" class="btn-secondary" @click="cancel">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.task-column {
  background: var(--column-bg);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.15s, outline 0.15s;
  outline: 2px solid transparent;
  outline-offset: -2px;
}

.task-column.drag-over {
  background: var(--accent-bg);
  outline-color: var(--accent-border);
}

.column-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 2px;
  letter-spacing: 0.2px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 48px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text);
  opacity: 0.4;
  text-align: center;
  padding: 16px 0 8px;
  margin: 0;
}

.add-task-area {
  margin-top: 4px;
}

.add-task-btn {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1.5px dashed var(--border);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  opacity: 0.6;
  transition: opacity 0.12s, border-color 0.12s, color 0.12s;
}

.add-task-btn:hover {
  opacity: 1;
  border-color: var(--accent-border);
  color: var(--accent);
}

.add-task-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-input {
  padding: 9px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: var(--card-bg);
  color: var(--text-h);
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.12s;
}

.task-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-section {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text);
  display: block;
}

.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.6;
}

.energy-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.energy-opt {
  padding: 3px 10px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  transition: all 0.12s;
}

.energy-opt.active {
  border-color: var(--text-h);
  color: var(--text-h);
  background: var(--border);
}

.energy-opt.energy-tiny.active   { border-color: var(--energy-tiny-active);   color: var(--energy-tiny-active);   background: var(--energy-tiny-bg); }
.energy-opt.energy-small.active  { border-color: var(--energy-small-active);  color: var(--energy-small-active);  background: var(--energy-small-bg); }
.energy-opt.energy-medium.active { border-color: var(--energy-medium-active); color: var(--energy-medium-active); background: var(--energy-medium-bg); }
.energy-opt.energy-large.active  { border-color: var(--energy-large-active);  color: var(--energy-large-active);  background: var(--energy-large-bg); }

.form-dates {
  display: flex;
  gap: 8px;
}

.form-date-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.date-input {
  padding: 7px 8px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: var(--card-bg);
  color: var(--text-h);
  font-family: inherit;
  font-size: 13px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.12s;
}

.date-input:focus {
  outline: none;
  border-color: var(--accent);
}

.pending-subtasks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pending-subtask-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-h);
  padding: 2px 0;
}

.subtask-remove-btn {
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 11px;
  opacity: 0.5;
  padding: 2px 4px;
  border-radius: 3px;
}

.subtask-remove-btn:hover {
  opacity: 1;
  color: var(--energy-large-active);
}

.add-subtask-row {
  display: flex;
  gap: 5px;
}

.subtask-input {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--card-bg);
  color: var(--text-h);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.12s;
}

.subtask-input:focus {
  outline: none;
  border-color: var(--accent);
}

.btn-subtle {
  padding: 5px 10px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s;
}

.btn-subtle:hover {
  background: var(--border);
}

.form-footer {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-primary {
  padding: 7px 14px;
  border-radius: 7px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.12s;
}

.btn-primary:hover {
  opacity: 0.85;
}

.btn-secondary {
  padding: 7px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s;
}

.btn-secondary:hover {
  background: var(--border);
}
</style>
