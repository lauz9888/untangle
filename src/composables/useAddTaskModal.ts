import { ref, computed, watch, type Ref } from 'vue'
import type { SectionKey } from './useSectionCollapse'
import type { EnergyLevel } from './useEnergyLevel'

export interface SubTask {
  id: number
  text: string
}

type EstimateField = 'days' | 'hours' | 'minutes'

const isOpen = ref(false)
const isConfirmOpen = ref(false)
const taskName = ref('')
const nowNextLater: Ref<SectionKey> = ref('now')
const description = ref('')
const energyLevel: Ref<EnergyLevel | null> = ref(null)
const estimateDays = ref('')
const estimateHours = ref('')
const estimateMinutes = ref('')
const availableFrom = ref('')
const dueBy = ref('')
const subTasks: Ref<SubTask[]> = ref([])
const isSubTaskInputOpen = ref(false)
const subTaskDraft = ref('')
const taskNameInvalid = ref(false)

// Module-scoped and intentionally never reset by resetFields()/openModal() — see design.md's
// Risks section: this avoids two sub-tasks across two different modal sessions ever colliding on
// the same id within a single page load, which matters for Vue's :key stability in the v-for list.
let nextSubTaskId = 1

function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

function estimateFieldHasValue(value: string): boolean {
  return Number(value) > 0
}

const dueByInvalid = computed(() => {
  if (!availableFrom.value || !dueBy.value) {
    return false
  }
  return dueBy.value < availableFrom.value
})

const canSaveSubTaskDraft = computed(() => subTaskDraft.value.trim() !== '')

const hasValue = computed(() => {
  return (
    taskName.value.trim() !== '' ||
    description.value.trim() !== '' ||
    energyLevel.value !== null ||
    estimateFieldHasValue(estimateDays.value) ||
    estimateFieldHasValue(estimateHours.value) ||
    estimateFieldHasValue(estimateMinutes.value) ||
    availableFrom.value !== '' ||
    dueBy.value !== '' ||
    nowNextLater.value !== 'now' ||
    subTasks.value.length > 0 ||
    (isSubTaskInputOpen.value && subTaskDraft.value.trim() !== '')
  )
})

watch(
  taskName,
  () => {
    taskNameInvalid.value = false
  },
  { flush: 'sync' }
)

function resetFields() {
  taskName.value = ''
  nowNextLater.value = 'now'
  description.value = ''
  energyLevel.value = null
  estimateDays.value = ''
  estimateHours.value = ''
  estimateMinutes.value = ''
  availableFrom.value = ''
  dueBy.value = ''
  subTasks.value = []
  isSubTaskInputOpen.value = false
  subTaskDraft.value = ''
  taskNameInvalid.value = false
}

function openModal() {
  resetFields()
  isOpen.value = true
}

function requestClose() {
  if (hasValue.value) {
    isConfirmOpen.value = true
    return
  }
  isOpen.value = false
}

function confirmDiscard() {
  resetFields()
  isOpen.value = false
  isConfirmOpen.value = false
}

function cancelDiscard() {
  isConfirmOpen.value = false
}

function selectSection(key: SectionKey) {
  nowNextLater.value = key
}

function selectEnergyLevel(level: EnergyLevel) {
  if (energyLevel.value === level) {
    energyLevel.value = null
    return
  }
  energyLevel.value = level
}

function openSubTaskInput() {
  isSubTaskInputOpen.value = true
}

function closeSubTaskInput() {
  isSubTaskInputOpen.value = false
  subTaskDraft.value = ''
}

function saveSubTaskDraft() {
  const trimmed = subTaskDraft.value.trim()
  if (trimmed === '') {
    return
  }
  subTasks.value.push({ id: nextSubTaskId++, text: trimmed })
  subTaskDraft.value = ''
  isSubTaskInputOpen.value = false
}

function removeSubTask(id: number) {
  subTasks.value = subTasks.value.filter((subTask) => subTask.id !== id)
}

function setEstimateField(field: EstimateField, rawValue: string): void {
  const sanitized = sanitizeDigitsOnly(rawValue)
  if (field === 'days') {
    estimateDays.value = sanitized
  } else if (field === 'hours') {
    estimateHours.value = sanitized
  } else {
    estimateMinutes.value = sanitized
  }
}

function save(): boolean {
  if (taskName.value.trim() === '') {
    taskNameInvalid.value = true
    return false
  }
  if (dueByInvalid.value) {
    return false
  }
  isOpen.value = false
  return true
}

export function useAddTaskModal() {
  return {
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
    hasValue,
    dueByInvalid,
    canSaveSubTaskDraft,
    openModal,
    requestClose,
    confirmDiscard,
    cancelDiscard,
    selectSection,
    selectEnergyLevel,
    openSubTaskInput,
    closeSubTaskInput,
    saveSubTaskDraft,
    removeSubTask,
    setEstimateField,
    save,
  }
}
