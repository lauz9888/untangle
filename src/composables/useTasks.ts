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

// Exhaustive-by-construction enum tables: a Record keyed by the union makes tsc fail if a union
// member is added or removed without updating the table. Deliberately local (not imported at
// runtime from useSectionCollapse/useEnergyLevel) so hydration isn't coupled to tests' module mocks.
const SECTION_TABLE: Record<SectionKey, true> = { now: true, next: true, later: true }
const ENERGY_TABLE: Record<EnergyLevel, true> = { low: true, medium: true, high: true }

function isSection(v: unknown): v is SectionKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(SECTION_TABLE, v)
}

function isEnergy(v: unknown): v is EnergyLevel {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(ENERGY_TABLE, v)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0
}

function finiteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toNonNegInt(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

// Gives every entry a unique positive-integer id: the first holder of a valid id keeps it; invalid
// or duplicate ids get fresh values above the maximum valid id present.
function resolveIds<T extends { id: number | null }>(items: T[]): Array<T & { id: number }> {
  let max = 0
  for (const item of items) if (item.id !== null && item.id > max) max = item.id
  const seen = new Set<number>()
  return items.map((item) => {
    let id = item.id
    if (id === null || seen.has(id)) id = ++max
    seen.add(id)
    return { ...item, id }
  })
}

function normalizeSubTasks(raw: unknown): TaskSubTask[] {
  if (!Array.isArray(raw)) return []
  const kept: Array<{ id: number | null; text: string; done: boolean }> = []
  for (const el of raw) {
    if (!isPlainObject(el)) continue
    if (typeof el.text !== 'string') continue
    const text = el.text.trim()
    if (text === '') continue
    kept.push({
      id: isValidId(el.id) ? el.id : null,
      text,
      done: typeof el.done === 'boolean' ? el.done : false,
    })
  }
  return resolveIds(kept)
}

type PendingTask = Omit<Task, 'id'> & { id: number | null }

function normalizeTask(el: unknown, now: number): PendingTask | null {
  if (!isPlainObject(el)) return null
  if (typeof el.name !== 'string') return null
  const name = el.name.trim()
  if (name === '') return null

  const est = isPlainObject(el.estimate) ? el.estimate : {}
  const created = finiteNumber(el.createdAt)
  const updated = finiteNumber(el.updatedAt)
  const createdAt = created ?? updated ?? now
  const updatedAt = updated ?? createdAt

  return {
    id: isValidId(el.id) ? el.id : null,
    name,
    section: isSection(el.section) ? el.section : 'now',
    description: typeof el.description === 'string' ? el.description : '',
    energyLevel: isEnergy(el.energyLevel) ? el.energyLevel : null,
    estimate: {
      days: toNonNegInt(est.days),
      hours: Math.min(toNonNegInt(est.hours), 23),
      minutes: Math.min(toNonNegInt(est.minutes), 59),
    },
    availableFrom: typeof el.availableFrom === 'string' ? el.availableFrom : null,
    dueBy: typeof el.dueBy === 'string' ? el.dueBy : null,
    subTasks: normalizeSubTasks(el.subTasks),
    done: typeof el.done === 'boolean' ? el.done : false,
    createdAt,
    updatedAt,
  }
}

// Repairs or drops each stored element so the rest of the app only ever sees well-typed Tasks.
// Unrecoverable (dropped): non-object elements and elements without a non-empty string name.
// Most rules were driven by failures observed on the previous unvalidated loader (see the hydration
// validation addendum in docs/adr/0003-localstorage-persistence-for-task-store.md).
// DEFENSIVE (no failure observed): the no-write-back policy (repairs persist only at the next
// mutation) and the mutators' tolerance of malformed records.
function normalizeStoredTasks(parsed: unknown, now: number): Task[] {
  if (!Array.isArray(parsed)) return []
  const pending: PendingTask[] = []
  for (const el of parsed) {
    const task = normalizeTask(el, now)
    if (task) pending.push(task)
  }
  return resolveIds(pending)
}

function loadInitialTasks(): Task[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(TASKS_STORAGE_KEY)
    if (!raw) return []
    return normalizeStoredTasks(JSON.parse(raw), Date.now())
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

// A single, stable module-level object (not a fresh literal per call) so that any caller —
// including vi.spyOn(tasks, 'updateTask')-style test spies — observes the exact same function
// references regardless of which call site obtained them. Every useTasks() call returns this
// one object; nothing here changes the store's actual shared-singleton behavior (tasksInternal
// was already shared by reference), it just makes the *returned object itself* stable too.
const api = {
  tasks: tasksInternal,
  addTask,
  updateTask,
  removeTask,
  toggleTaskDone,
  toggleSubTaskDone,
}

export function useTasks() {
  return api
}
