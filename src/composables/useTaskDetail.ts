import { ref, computed, type Ref } from 'vue'
import type { SectionKey } from './useSectionCollapse'
import type { EnergyLevel } from './useEnergyLevel'
import { useTasks, type UpdateTaskChanges } from './useTasks'
import { useCelebration } from './useCelebration'

export interface DraftSubTask {
  id: number
  text: string
  isNew: boolean
}

type EstimateField = 'days' | 'hours' | 'minutes'

const selectedTaskId: Ref<number | null> = ref(null)
const lastOpenedTaskId: Ref<number | null> = ref(null)
const lastOpenedTaskSection: Ref<SectionKey | null> = ref(null)
const openedFrom: Ref<'board' | 'completed'> = ref('board')
const isDiscardConfirmOpen = ref(false)
const isDeleteConfirmOpen = ref(false)

const name = ref('')
const section: Ref<SectionKey> = ref('now')
const description = ref('')
const energyLevel: Ref<EnergyLevel | null> = ref(null)
const estimateDays = ref('')
const estimateHours = ref('')
const estimateMinutes = ref('')
const availableFrom = ref('')
const dueBy = ref('')
const subTasks: Ref<DraftSubTask[]> = ref([])
const isSubTaskInputOpen = ref(false)
const subTaskDraft = ref('')
const nameInvalid = ref(false)

// Re-seeded per open() to max(existing sub-task ids, 0) + 1 — see design.md's Risks section:
// ids only need to be unique within this one task's own subTasks array, not globally, so this
// deliberately does not share a counter with useAddTaskModal.ts's nextSubTaskId.
let nextDraftSubTaskId = 1

const isOpen = computed(() => selectedTaskId.value !== null)

const storedTask = computed(() => {
  if (selectedTaskId.value === null) {
    return null
  }
  return useTasks().tasks.value.find((task) => task.id === selectedTaskId.value) ?? null
})

function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function clampToMax(digitsOnly: string, max: number): string {
  if (digitsOnly === '') {
    return digitsOnly
  }
  return Number(digitsOnly) > max ? String(max) : digitsOnly
}

const dueByInvalid = computed(() => {
  if (!availableFrom.value || !dueBy.value) {
    return false
  }
  return dueBy.value < availableFrom.value
})

const canSaveSubTaskDraft = computed(() => subTaskDraft.value.trim() !== '')

const hasUnsavedChanges = computed(() => {
  const stored = storedTask.value
  if (!stored) {
    return false
  }

  if (name.value.trim() !== stored.name) return true
  if (section.value !== stored.section) return true
  if (description.value !== stored.description) return true
  if (energyLevel.value !== stored.energyLevel) return true
  if ((Number(estimateDays.value) || 0) !== stored.estimate.days) return true
  if ((Number(estimateHours.value) || 0) !== stored.estimate.hours) return true
  if ((Number(estimateMinutes.value) || 0) !== stored.estimate.minutes) return true
  if ((availableFrom.value || null) !== stored.availableFrom) return true
  if ((dueBy.value || null) !== stored.dueBy) return true

  const draftSubTasks = subTasks.value.map((subTask) => ({ id: subTask.id, text: subTask.text }))
  const storedSubTasks = stored.subTasks.map((subTask) => ({
    id: subTask.id,
    text: subTask.text,
  }))
  if (draftSubTasks.length !== storedSubTasks.length) return true
  for (let i = 0; i < draftSubTasks.length; i++) {
    if (
      draftSubTasks[i]!.id !== storedSubTasks[i]!.id ||
      draftSubTasks[i]!.text !== storedSubTasks[i]!.text
    ) {
      return true
    }
  }

  return false
})

function open(taskId: number, origin: 'board' | 'completed' = 'board'): void {
  const task = useTasks().tasks.value.find((t) => t.id === taskId)
  if (!task) {
    return
  }

  openedFrom.value = origin
  selectedTaskId.value = taskId
  lastOpenedTaskId.value = taskId
  lastOpenedTaskSection.value = task.section

  name.value = task.name
  section.value = task.section
  description.value = task.description
  energyLevel.value = task.energyLevel
  estimateDays.value = String(task.estimate.days)
  estimateHours.value = String(task.estimate.hours)
  estimateMinutes.value = String(task.estimate.minutes)
  availableFrom.value = task.availableFrom ?? ''
  dueBy.value = task.dueBy ?? ''
  subTasks.value = task.subTasks.map((subTask) => ({
    id: subTask.id,
    text: subTask.text,
    isNew: false,
  }))

  nextDraftSubTaskId = task.subTasks.reduce((max, subTask) => Math.max(max, subTask.id), 0) + 1
  isSubTaskInputOpen.value = false
  subTaskDraft.value = ''
  nameInvalid.value = false
  isDiscardConfirmOpen.value = false
  isDeleteConfirmOpen.value = false
}

function close(): void {
  selectedTaskId.value = null
  isDiscardConfirmOpen.value = false
  isDeleteConfirmOpen.value = false
}

function requestClose(): void {
  if (hasUnsavedChanges.value) {
    isDiscardConfirmOpen.value = true
    return
  }
  close()
}

function confirmDiscard(): void {
  close()
}

function cancelDiscard(): void {
  isDiscardConfirmOpen.value = false
}

function requestDelete(): void {
  isDeleteConfirmOpen.value = true
}

function confirmDelete(): void {
  if (selectedTaskId.value !== null) {
    useTasks().removeTask(selectedTaskId.value)
  }
  close()
}

function cancelDelete(): void {
  isDeleteConfirmOpen.value = false
}

function toggleDone(): void {
  const id = selectedTaskId.value
  if (id === null) {
    return
  }
  const completed = useCelebration().toggleTaskDoneWithCelebration(id, {
    computeFocusTarget: openedFrom.value === 'board',
  })
  if (completed) {
    close()
  }
}

function toggleSubTaskDoneInView(subTaskId: number): void {
  if (selectedTaskId.value !== null) {
    useTasks().toggleSubTaskDone(selectedTaskId.value, subTaskId)
  }
}

function selectSection(key: SectionKey): void {
  section.value = key
}

function selectEnergyLevel(level: EnergyLevel): void {
  if (energyLevel.value === level) {
    energyLevel.value = null
    return
  }
  energyLevel.value = level
}

function setEstimateField(field: EstimateField, rawValue: string): void {
  const sanitized = sanitizeDigitsOnly(rawValue)
  if (field === 'days') {
    estimateDays.value = sanitized
  } else if (field === 'hours') {
    estimateHours.value = clampToMax(sanitized, 23)
  } else {
    estimateMinutes.value = clampToMax(sanitized, 59)
  }
}

function openSubTaskInput(): void {
  isSubTaskInputOpen.value = true
}

function closeSubTaskInput(): void {
  isSubTaskInputOpen.value = false
  subTaskDraft.value = ''
}

function saveSubTaskDraft(): void {
  const trimmed = subTaskDraft.value.trim()
  if (trimmed === '') {
    return
  }
  subTasks.value.push({ id: nextDraftSubTaskId++, text: trimmed, isNew: true })
  subTaskDraft.value = ''
  isSubTaskInputOpen.value = false
}

function removeSubTask(id: number): void {
  subTasks.value = subTasks.value.filter((subTask) => subTask.id !== id)
}

function save(): boolean {
  if (name.value.trim() === '') {
    nameInvalid.value = true
    return false
  }
  if (dueByInvalid.value) {
    return false
  }
  if (selectedTaskId.value === null) {
    // Defensive/unreachable in practice: the modal cannot be open without a selected task.
    return false
  }

  const stored = storedTask.value
  const finalSubTasks = subTasks.value.map((subTask) => {
    if (subTask.isNew) {
      return { id: subTask.id, text: subTask.text.trim(), done: false }
    }
    const existing = stored?.subTasks.find((s) => s.id === subTask.id)
    return { id: subTask.id, text: subTask.text.trim(), done: existing?.done ?? false }
  })

  const changes: UpdateTaskChanges = {
    name: name.value,
    section: section.value,
    description: description.value,
    energyLevel: energyLevel.value,
    estimate: {
      days: Number(estimateDays.value) || 0,
      hours: Number(estimateHours.value) || 0,
      minutes: Number(estimateMinutes.value) || 0,
    },
    availableFrom: availableFrom.value || null,
    dueBy: dueBy.value || null,
    subTasks: finalSubTasks,
  }

  const updated = useTasks().updateTask(selectedTaskId.value, changes)
  if (!updated) {
    // Defensive/unreachable in practice: save()'s own checks above already enforce the same two
    // rules updateTask() re-validates (Requirements 6/7).
    return false
  }

  close()
  return true
}

export function useTaskDetail() {
  return {
    selectedTaskId,
    isOpen,
    lastOpenedTaskId,
    lastOpenedTaskSection,
    openedFrom,
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
    hasUnsavedChanges,
    open,
    close,
    requestClose,
    confirmDiscard,
    cancelDiscard,
    requestDelete,
    confirmDelete,
    cancelDelete,
    toggleDone,
    toggleSubTaskDoneInView,
    selectSection,
    selectEnergyLevel,
    setEstimateField,
    openSubTaskInput,
    closeSubTaskInput,
    saveSubTaskDraft,
    removeSubTask,
    save,
  }
}
