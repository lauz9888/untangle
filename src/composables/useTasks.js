import { ref, watch } from 'vue'
import { ENERGY_LEVELS, COLUMNS } from '../constants/energy.js'
import { useStreak } from './useStreak.js'

const { recordCompletion } = useStreak()

const STORAGE_KEY = 'untangle-tasks'
const ENERGY_KEY = 'untangle-energy'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}
const today = ref(todayString())
setInterval(() => { today.value = todayString() }, 60_000)

function loadFromStorage(key, fallback, { raw = false } = {}) {
  try {
    const val = localStorage.getItem(key)
    if (val === null) return fallback
    return raw ? val : JSON.parse(val)
  } catch {
    return fallback
  }
}

function migrateTask(task) {
  return {
    energy: null,
    dueDate: null,
    availableFrom: null,
    subtasks: [],
    completedAt: null,
    ...task,
  }
}

const rawTasks = loadFromStorage(STORAGE_KEY, [])
const tasks = ref((Array.isArray(rawTasks) ? rawTasks : []).map(migrateTask))
const currentEnergy = ref(loadFromStorage(ENERGY_KEY, null, { raw: true }) || null)

watch(tasks, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

watch(currentEnergy, (val) => {
  localStorage.setItem(ENERGY_KEY, val ?? '')
})

function energyRank(id) {
  return ENERGY_LEVELS.find(e => e.id === id)?.rank ?? 0
}

export function useTasks() {
  function isOverCapacity(task) {
    if (!task.energy || !currentEnergy.value) return false
    return energyRank(task.energy) > energyRank(currentEnergy.value)
  }

  function isNotYetAvailable(task) {
    return !!task.availableFrom && task.availableFrom > today.value
  }

  function tasksForColumn(columnId) {
    return tasks.value.filter(t => t.column === columnId && !t.completedAt)
  }

  function addTask(title, column, { energy = null, dueDate = null, availableFrom = null, subtasks = [] } = {}) {
    tasks.value.push({
      id: crypto.randomUUID(),
      title: title.trim(),
      energy,
      column,
      createdAt: Date.now(),
      completedAt: null,
      dueDate: dueDate || null,
      availableFrom: availableFrom || null,
      subtasks: subtasks.map(s => ({
        id: crypto.randomUUID(),
        title: typeof s === 'string' ? s.trim() : s.title.trim(),
        done: false,
      })).filter(s => s.title),
    })
  }

  function deleteTask(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  function completeTask(id) {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.completedAt = Date.now()
      return recordCompletion()
    }
    return null
  }

  function updateTask(id, changes) {
    const task = tasks.value.find(t => t.id === id)
    if (task) Object.assign(task, changes)
  }

  function moveTask(id, direction) {
    const columnIds = COLUMNS.map(c => c.id)
    const task = tasks.value.find(t => t.id === id)
    if (!task) return
    const idx = columnIds.indexOf(task.column)
    const newIdx = idx + direction
    if (newIdx >= 0 && newIdx < columnIds.length) {
      task.column = columnIds[newIdx]
    }
  }

  function moveTaskToColumn(id, columnId) {
    const task = tasks.value.find(t => t.id === id)
    if (task && COLUMNS.some(c => c.id === columnId)) {
      task.column = columnId
    }
  }

  function addSubtask(taskId, title) {
    const task = tasks.value.find(t => t.id === taskId)
    const trimmed = title?.trim()
    if (task && trimmed) {
      task.subtasks.push({ id: crypto.randomUUID(), title: trimmed, done: false })
    }
  }

  function deleteSubtask(taskId, subtaskId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task) task.subtasks = task.subtasks.filter(s => s.id !== subtaskId)
  }

  function toggleSubtask(taskId, subtaskId) {
    const task = tasks.value.find(t => t.id === taskId)
    const subtask = task?.subtasks.find(s => s.id === subtaskId)
    if (subtask) subtask.done = !subtask.done
  }

  return {
    tasks,
    currentEnergy,
    today,
    tasksForColumn,
    isOverCapacity,
    isNotYetAvailable,
    addTask,
    deleteTask,
    completeTask,
    updateTask,
    moveTask,
    moveTaskToColumn,
    addSubtask,
    deleteSubtask,
    toggleSubtask,
  }
}
