<script setup>
import { ref, computed } from 'vue'
import { useTasks } from '../composables/useTasks.js'
import { useCelebration, STREAK_MILESTONES } from '../composables/useCelebration.js'
import { useTaskDrag } from '../composables/useDragDrop.js'
import { ENERGY_LEVELS } from '../constants/energy.js'

const OVERDUE_MESSAGES = [
  "Every deadline is a chance to reset — what's a realistic date you can commit to today?",
  "You've got this! Take a moment to choose a due date that actually works for you.",
  "Progress, not perfection. Let's find a new timeline that sets you up to succeed.",
  "Being honest with yourself about time is a superpower. Pick a date that feels achievable.",
  "Plans change, and that's okay. What's a new due date you can genuinely commit to?",
  "This task is still worth doing! When realistically could you get it done?",
  "Rescheduling isn't failing — it's planning smarter. What date works better for you?",
  "Future you will thank you for setting a realistic deadline. What date makes sense?",
  "Take a breath — now, what's a due date you can actually meet?",
  "Every great plan gets adjusted. What's your new target date for this one?",
  "You're being thoughtful by reviewing this. What's a due date that respects your current capacity?",
  "Timelines shift — what matters is keeping momentum. Set a new date and keep going!",
  "Be kind to yourself. What's a due date that's both ambitious and realistic?",
  "The best deadline is one you can actually meet. What date works for you now?",
  "One small adjustment to the timeline could unlock a lot of momentum. What date feels right?",
]

const props = defineProps({
  task: { type: Object, required: true },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
})

const { deleteTask, completeTask, updateTask, moveTask, isOverCapacity, isNotYetAvailable, today, addSubtask, deleteSubtask, toggleSubtask } = useTasks()
const { showCelebration, showMilestone } = useCelebration()

function handleComplete(id) {
  const newStreak = completeTask(id)
  if (newStreak !== null && STREAK_MILESTONES.includes(newStreak)) {
    showMilestone(newStreak)
  } else {
    showCelebration()
  }
}

// ── display ──────────────────────────────────────────────────────────────────

const doneSubtasks = computed(() => props.task.subtasks.filter(s => s.done).length)
const subtaskProgress = computed(() =>
  props.task.subtasks.length ? (doneSubtasks.value / props.task.subtasks.length) * 100 : 0
)

const isOverdue = computed(() => !!props.task.dueDate && props.task.dueDate < today.value)

function formatDate(dateStr) {
  if (!dateStr) return ''
  // Parse as local date components to avoid UTC-midnight timezone offset issues
  // (new Date('2025-06-15') is UTC midnight, which shifts to the previous day in negative-offset timezones)
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── drag + edit ───────────────────────────────────────────────────────────────

const cardEl = ref(null)
const editing = ref(false)

const { isDragging, onDragStart, onDragEnd, handleTouchStart } = useTaskDrag(props.task.id, cardEl, editing)

const editTitle = ref('')
const editEnergy = ref(null)
const editDueDate = ref('')
const editAvailableFrom = ref('')
const newSubtaskTitle = ref('')
const showOverdueMessage = ref(false)
const overdueMessage = ref('')

function startEdit() {
  editTitle.value = props.task.title
  editEnergy.value = props.task.energy
  editDueDate.value = props.task.dueDate ?? ''
  editAvailableFrom.value = props.task.availableFrom ?? ''
  newSubtaskTitle.value = ''
  if (isOverdue.value) {
    overdueMessage.value = OVERDUE_MESSAGES[Math.floor(Math.random() * OVERDUE_MESSAGES.length)]
    showOverdueMessage.value = true
  } else {
    showOverdueMessage.value = false
  }
  editing.value = true
}

function saveEdit() {
  const trimmed = editTitle.value.trim()
  if (!trimmed) return
  updateTask(props.task.id, {
    title: trimmed,
    energy: editEnergy.value,
    dueDate: editDueDate.value || null,
    availableFrom: editAvailableFrom.value || null,
  })
  showOverdueMessage.value = false
  editing.value = false
}

function cancelEdit() {
  showOverdueMessage.value = false
  editing.value = false
}

function addSubtaskAction() {
  const trimmed = newSubtaskTitle.value.trim()
  if (!trimmed) return
  addSubtask(props.task.id, trimmed)
  newSubtaskTitle.value = ''
}
</script>

<template>
  <div
    ref="cardEl"
    class="task-card"
    :class="[task.energy ? `energy-border-${task.energy}` : 'energy-border-none',
             { 'over-capacity': isOverCapacity(task), 'not-yet-available': isNotYetAvailable(task), 'is-dragging': isDragging, 'is-editing': editing }]"
    :draggable="!editing"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @touchstart="handleTouchStart"
  >

    <!-- ── Display mode ── -->
    <template v-if="!editing">
      <button
        v-if="isOverdue"
        type="button"
        class="overdue-alert-btn"
        title="This task is overdue — click to review"
        aria-label="Overdue task — click to update due date"
        data-testid="overdue-alert-btn"
        @click="startEdit"
      >!</button>
      <div class="task-main" :class="{ 'has-overdue-icon': isOverdue }">
        <p class="task-title" data-testid="task-title">{{ task.title }}</p>
        <div v-if="task.energy || task.dueDate || task.availableFrom" class="task-meta">
          <span v-if="task.energy" class="energy-badge" :class="`energy-${task.energy}`">{{ task.energy }}</span>
          <span v-if="task.availableFrom" class="date-chip from-chip">
            From {{ formatDate(task.availableFrom) }}
          </span>
          <span v-if="task.dueDate" class="date-chip" :class="{ overdue: isOverdue }">
            Due {{ formatDate(task.dueDate) }}
          </span>
        </div>
        <div v-if="task.subtasks.length > 0" class="subtask-row">
          <div class="subtask-bar">
            <div class="subtask-fill" :style="{ width: subtaskProgress + '%' }"></div>
          </div>
          <span class="subtask-count">{{ doneSubtasks }}/{{ task.subtasks.length }}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn complete-btn" data-testid="complete-btn" title="Mark complete" :aria-label="`Mark complete: ${task.title}`" @click="handleComplete(task.id)">✓</button>
        <button class="action-btn edit-btn" data-testid="edit-btn" title="Edit task" aria-label="Edit task" @click="startEdit">✎</button>
        <button class="action-btn move-prev-btn" data-testid="move-prev-btn" :disabled="isFirst" title="Move to earlier column" aria-label="Move to earlier column" @click="moveTask(task.id, -1)">←</button>
        <button class="action-btn move-next-btn" data-testid="move-next-btn" :disabled="isLast"  title="Move to later column"   aria-label="Move to later column"   @click="moveTask(task.id, 1)">→</button>
        <button class="action-btn delete-btn" data-testid="delete-btn" :aria-label="`Delete task: ${task.title}`" title="Delete task" @click="deleteTask(task.id)">✕</button>
      </div>
    </template>

    <!-- ── Edit mode ── -->
    <template v-else>
      <form class="edit-form" @submit.prevent="saveEdit">

        <input
          v-model="editTitle"
          class="edit-title-input"
          data-testid="edit-title-input"
          placeholder="Task name"
          required
          autofocus
        />

        <fieldset class="edit-section">
          <legend class="edit-label">Energy</legend>
          <div class="energy-picker" role="group" aria-label="Energy level">
            <button type="button" class="energy-opt" :class="{ active: editEnergy === null }" @click="editEnergy = null">None</button>
            <button
              v-for="level in ENERGY_LEVELS"
              :key="level.id"
              type="button"
              class="energy-opt"
              :class="[`energy-${level.id}`, { active: editEnergy === level.id }]"
              @click="editEnergy = level.id"
            >{{ level.label }}</button>
          </div>
        </fieldset>

        <p v-if="showOverdueMessage" class="overdue-message" role="status">{{ overdueMessage }}</p>

        <div class="edit-dates">
          <div class="edit-date-field">
            <label class="edit-label">Available from</label>
            <input type="date" v-model="editAvailableFrom" class="date-input" data-testid="available-from-input" />
          </div>
          <div class="edit-date-field">
            <label class="edit-label">Due date</label>
            <input type="date" v-model="editDueDate" class="date-input" data-testid="due-date-input" />
          </div>
        </div>

        <fieldset class="edit-section">
          <legend class="edit-label">Subtasks</legend>
          <ul v-if="task.subtasks.length > 0" class="subtasks-list">
            <li v-for="subtask in task.subtasks" :key="subtask.id" class="subtask-item">
              <input
                type="checkbox"
                :checked="subtask.done"
                @change="toggleSubtask(task.id, subtask.id)"
                :aria-label="subtask.title"
              />
              <span class="subtask-title" :class="{ done: subtask.done }">{{ subtask.title }}</span>
              <button
                type="button"
                class="subtask-delete-btn"
                :aria-label="`Delete subtask: ${subtask.title}`"
                @click="deleteSubtask(task.id, subtask.id)"
              >✕</button>
            </li>
          </ul>
          <div class="add-subtask-row">
            <input
              v-model="newSubtaskTitle"
              class="subtask-input"
              placeholder="New subtask"
              @keydown.enter.prevent="addSubtaskAction"
            />
            <button type="button" class="btn-subtle" @click="addSubtaskAction">Add</button>
          </div>
        </fieldset>

        <div class="edit-footer">
          <button type="submit" class="btn-primary">Save</button>
          <button type="button" class="btn-secondary" @click="cancelEdit">Cancel</button>
        </div>

      </form>
    </template>

  </div>
</template>

<style scoped>
.task-card {
  background: var(--card-bg);
  border-radius: 10px;
  padding: 12px 12px 8px;
  box-shadow: var(--card-shadow);
  border-left: 3px solid transparent;
  transition: opacity 0.2s, box-shadow 0.15s;
  cursor: grab;
  user-select: none;
  position: relative;
}

.overdue-alert-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--energy-large-bg);
  color: var(--energy-large-active);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.12s, transform 0.1s;
  z-index: 1;
}

.overdue-alert-btn:hover {
  background: var(--energy-large-active);
  color: #fff;
  transform: scale(1.1);
}

.overdue-alert-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.task-main.has-overdue-icon {
  padding-right: 26px;
}

.overdue-message {
  margin: 0;
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--energy-large-bg);
  color: var(--energy-large-active);
  font-size: 12px;
  line-height: 1.5;
}

.task-card:hover {
  box-shadow: var(--card-shadow-hover);
}

.task-card.is-editing {
  cursor: default;
  user-select: auto;
  box-shadow: var(--card-shadow-hover);
}

.task-card.is-dragging {
  opacity: 0.45;
  cursor: grabbing;
}

.task-card.over-capacity {
  opacity: 0.35;
}

.task-card.not-yet-available {
  opacity: 0.35;
}

.energy-border-tiny   { border-left-color: var(--energy-tiny-border); }
.energy-border-small  { border-left-color: var(--energy-small-border); }
.energy-border-medium { border-left-color: var(--energy-medium-border); }
.energy-border-large  { border-left-color: var(--energy-large-border); }
.energy-border-none   { border-left-color: transparent; }

/* ── Display mode ──────────────────────────────────── */

.task-main {
  margin-bottom: 6px;
}

.task-title {
  margin: 0 0 4px;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-h);
  word-break: break-word;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
}

.energy-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 100px;
  white-space: nowrap;
}

.energy-badge.energy-tiny   { background: var(--energy-tiny-bg);   color: var(--energy-tiny-text); }
.energy-badge.energy-small  { background: var(--energy-small-bg);  color: var(--energy-small-text); }
.energy-badge.energy-medium { background: var(--energy-medium-bg); color: var(--energy-medium-text); }
.energy-badge.energy-large  { background: var(--energy-large-bg);  color: var(--energy-large-text); }

.date-chip {
  font-size: 11px;
  color: var(--text);
  background: var(--column-bg);
  padding: 2px 7px;
  border-radius: 100px;
  white-space: nowrap;
}

.date-chip.overdue {
  color: var(--energy-large-active);
  background: var(--energy-large-bg);
}

.date-chip.from-chip {
  opacity: 0.7;
}

.subtask-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 4px;
}

.subtask-bar {
  flex: 1;
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.subtask-fill {
  height: 100%;
  background: var(--energy-tiny-active);
  border-radius: 2px;
  transition: width 0.2s;
}

.subtask-count {
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
}

.task-actions {
  display: flex;
  gap: 1px;
  justify-content: flex-end;
}

.action-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.12s, background 0.12s;
}

.task-card:hover .action-btn {
  opacity: 0.5;
}

.action-btn:hover:not(:disabled) {
  opacity: 1 !important;
  background: var(--border);
}

.action-btn:disabled {
  opacity: 0 !important;
  cursor: default;
}

.complete-btn:hover:not(:disabled) {
  color: var(--energy-tiny-active);
  background: var(--energy-tiny-bg);
  opacity: 1 !important;
}

.delete-btn:hover:not(:disabled) {
  color: var(--energy-large-text);
  background: var(--energy-large-bg);
  opacity: 1 !important;
}

.action-btn:focus-visible {
  opacity: 1 !important;
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

/* On touch devices: always show buttons, larger tap targets */
@media (hover: none) {
  .action-btn {
    opacity: 0.5;
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .task-card:hover .action-btn {
    opacity: 0.5;
  }

  .action-btn:active:not(:disabled) {
    opacity: 1 !important;
    background: var(--border);
  }

  .action-btn:disabled {
    opacity: 0 !important;
  }

  .complete-btn:active:not(:disabled) {
    color: var(--energy-tiny-active);
    background: var(--energy-tiny-bg);
    opacity: 1 !important;
  }

  .delete-btn:active:not(:disabled) {
    color: var(--energy-large-text);
    background: var(--energy-large-bg);
    opacity: 1 !important;
  }

  .task-actions {
    gap: 2px;
  }
}

/* ── Edit mode ─────────────────────────────────────── */

@media (hover: none) {
  .subtask-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
  }

  .subtask-delete-btn {
    width: 32px;
    height: 32px;
    font-size: 13px;
    opacity: 0.5;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .energy-opt {
    padding: 6px 14px;
    font-size: 13px;
  }

  .edit-title-input,
  .subtask-input,
  .date-input {
    font-size: 16px; /* prevents iOS auto-zoom on focus */
  }
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.edit-title-input {
  padding: 8px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--accent);
  background: var(--bg);
  color: var(--text-h);
  font-family: inherit;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
}

.edit-section {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text);
  display: block;
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

.edit-dates {
  display: flex;
  gap: 8px;
}

.edit-date-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.date-input {
  padding: 6px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--bg);
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

.subtasks-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
}

.subtask-item input[type="checkbox"] {
  flex-shrink: 0;
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.subtask-title {
  flex: 1;
  color: var(--text-h);
  word-break: break-word;
}

.subtask-title.done {
  text-decoration: line-through;
  opacity: 0.5;
}

.subtask-delete-btn {
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 11px;
  opacity: 0.4;
  padding: 2px 4px;
  border-radius: 3px;
  flex-shrink: 0;
  transition: opacity 0.12s, color 0.12s;
}

.subtask-delete-btn:hover {
  opacity: 1;
  color: var(--energy-large-active);
}

.add-subtask-row {
  display: flex;
  gap: 5px;
}

.subtask-input {
  flex: 1;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.12s;
  min-width: 0;
}

.subtask-input:focus {
  outline: none;
  border-color: var(--accent);
}

.edit-footer {
  display: flex;
  gap: 6px;
  align-items: center;
}
</style>
