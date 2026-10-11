import { ref, computed } from 'vue'
import { useTasks } from './useTasks'
import { useTaskDetail } from './useTaskDetail'

const isOpen = ref(false)

const completedTasks = computed(() =>
  useTasks()
    .tasks.value.filter((task) => task.done)
    .sort((a, b) => b.updatedAt - a.updatedAt || b.id - a.id)
)

const completedCount = computed(() => completedTasks.value.length)

function open(): void {
  isOpen.value = true
}

function close(): void {
  isOpen.value = false
}

function uncomplete(id: number): void {
  const store = useTasks()
  const task = store.tasks.value.find((t) => t.id === id)
  if (task?.done) {
    store.toggleTaskDone(id)
  }
}

function openTask(id: number): void {
  useTaskDetail().open(id, 'completed')
}

const api = { isOpen, completedTasks, completedCount, open, close, uncomplete, openTask }

export function useCompletedPanel() {
  return api
}
