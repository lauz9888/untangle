import { ref, type Ref } from 'vue'
import type { SectionKey } from './useSectionCollapse'
import type { EnergyLevel } from './useEnergyLevel'

export interface TaskSubTask {
  id: number
  text: string
  done: boolean
}

export interface TaskEstimate {
  days: number
  hours: number
  minutes: number
}

export interface Task {
  id: number
  name: string
  section: SectionKey
  description: string
  energyLevel: EnergyLevel | null
  estimate: TaskEstimate
  availableFrom: string | null
  dueBy: string | null
  subTasks: TaskSubTask[]
  done: boolean
  createdAt: number
  updatedAt: number
}

// Caller-supplied shape for addTask(): omits store-assigned fields (id/createdAt/updatedAt/done)
// and lets every optional field default sensibly, so AddTaskModal.vue's mapping stays simple.
export interface AddTaskInput {
  name: string
  section: SectionKey
  description?: string
  energyLevel?: EnergyLevel | null
  estimate?: Partial<TaskEstimate>
  availableFrom?: string | null
  dueBy?: string | null
  subTasks?: { text: string }[] // ids are store-assigned (see Risks, item 9)
}

export type UpdateTaskChanges = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>

export const TASKS_STORAGE_KEY = 'untangle:tasks'

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function loadInitialTasks(): Task[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasksInternal.value))
  } catch {
    // Quota exceeded / serialization failure / storage unavailable — in-memory
    // state remains usable for the rest of this session (Requirement 7).
  }
}

function computeNextId(tasks: Task[]): number {
  return tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1
}

const tasksInternal: Ref<Task[]> = ref(loadInitialTasks())
let nextTaskId = computeNextId(tasksInternal.value)

function isDueByValid(availableFrom: string | null, dueBy: string | null): boolean {
  if (!availableFrom || !dueBy) return true
  return dueBy >= availableFrom
}

function addTask(input: AddTaskInput): Task | null {
  const name = input.name.trim()
  if (name === '') return null

  const availableFrom = input.availableFrom ?? null
  const dueBy = input.dueBy ?? null
  if (!isDueByValid(availableFrom, dueBy)) return null

  const now = Date.now()
  const task: Task = {
    id: nextTaskId++,
    name,
    section: input.section,
    description: input.description ?? '',
    energyLevel: input.energyLevel ?? null,
    estimate: {
      days: input.estimate?.days ?? 0,
      hours: input.estimate?.hours ?? 0,
      minutes: input.estimate?.minutes ?? 0,
    },
    availableFrom,
    dueBy,
    subTasks: (input.subTasks ?? []).map((subTask, index) => ({
      id: index + 1, // scoped per-task, not globally unique — see Risks, item 9
      text: subTask.text,
      done: false,
    })),
    done: false,
    createdAt: now,
    updatedAt: now,
  }
  tasksInternal.value.push(task)
  persist()
  return task
}

function updateTask(id: number, changes: UpdateTaskChanges): boolean {
  const task = tasksInternal.value.find((t) => t.id === id)
  if (!task) return false

  const nextName = changes.name !== undefined ? changes.name.trim() : task.name
  if (nextName === '') return false

  const nextAvailableFrom =
    changes.availableFrom !== undefined ? changes.availableFrom : task.availableFrom
  const nextDueBy = changes.dueBy !== undefined ? changes.dueBy : task.dueBy
  if (!isDueByValid(nextAvailableFrom, nextDueBy)) return false

  Object.assign(task, changes, { name: nextName, updatedAt: Date.now() })
  persist()
  return true
}

function removeTask(id: number): boolean {
  const index = tasksInternal.value.findIndex((t) => t.id === id)
  if (index === -1) return false
  tasksInternal.value.splice(index, 1)
  persist()
  return true
}

function toggleTaskDone(id: number): boolean {
  const task = tasksInternal.value.find((t) => t.id === id)
  if (!task) return false
  task.done = !task.done
  task.updatedAt = Date.now()
  persist()
  return true
}

function toggleSubTaskDone(taskId: number, subTaskId: number): boolean {
  const task = tasksInternal.value.find((t) => t.id === taskId)
  if (!task) return false
  const subTask = task.subTasks.find((s) => s.id === subTaskId)
  if (!subTask) return false
  subTask.done = !subTask.done
  task.updatedAt = Date.now()
  persist()
  return true
}

export function useTasks() {
  return {
    tasks: tasksInternal,
    addTask,
    updateTask,
    removeTask,
    toggleTaskDone,
    toggleSubTaskDone,
  }
}
