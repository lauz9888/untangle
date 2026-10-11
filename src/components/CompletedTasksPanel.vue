<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useCompletedPanel } from '../composables/useCompletedPanel'
import { useTaskDetail } from '../composables/useTaskDetail'
import { useFocusTrap } from '../composables/useFocusTrap'

const { completedTasks, close, uncomplete, openTask } = useCompletedPanel()
const { isOpen: isTaskDetailOpen, openedFrom, lastOpenedTaskId } = useTaskDetail()

const contentRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const rowButtonRefs = new Map<number, HTMLElement>()

const { handleKeydown } = useFocusTrap(contentRef)

function setRowButtonRef(id: number, el: HTMLElement | null) {
  if (el) {
    rowButtonRefs.set(id, el)
  } else {
    rowButtonRefs.delete(id)
  }
}

function onEscape() {
  if (isTaskDetailOpen.value) return
  close()
}

function onTrapKeydown(event: KeyboardEvent) {
  if (isTaskDetailOpen.value) return
  handleKeydown(event)
}

onMounted(() => {
  nextTick(() => closeButtonRef.value?.focus())
})

function onUncomplete(id: number, event: Event) {
  const item = (event.target as HTMLElement).closest('li')
  const sibling = item?.nextElementSibling ?? item?.previousElementSibling ?? null
  const target = sibling?.querySelector<HTMLElement>('.completed-checkbox') ?? null
  uncomplete(id)
  nextTick(() => {
    if (target && target.isConnected) {
      target.focus()
    } else {
      closeButtonRef.value?.focus()
    }
  })
}

watch(isTaskDetailOpen, (now, was) => {
  if (was && !now && openedFrom.value === 'completed') {
    nextTick(() => {
      const id = lastOpenedTaskId.value
      const row = id !== null ? rowButtonRefs.get(id) : undefined
      ;(row ?? closeButtonRef.value)?.focus()
    })
  }
})
</script>

<template>
  <div
    class="completed-overlay"
    tabindex="-1"
    :inert="isTaskDetailOpen ? true : undefined"
    :aria-hidden="isTaskDetailOpen ? 'true' : undefined"
    @click.self="close"
    @keydown.esc="onEscape"
    @keydown="onTrapKeydown"
  >
    <div
      ref="contentRef"
      class="completed-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completed-heading"
    >
      <h2 id="completed-heading">Completed tasks</h2>
      <button
        ref="closeButtonRef"
        type="button"
        class="close-button"
        aria-label="Close"
        @click="close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p v-if="completedTasks.length === 0" class="completed-empty">No completed tasks yet</p>
      <ul v-else class="completed-list">
        <li v-for="task in completedTasks" :key="task.id" class="completed-item">
          <input
            type="checkbox"
            checked
            class="completed-checkbox"
            :aria-label="task.name"
            @change="onUncomplete(task.id, $event)"
          />
          <button
            :ref="(el) => setRowButtonRef(task.id, el as HTMLElement | null)"
            type="button"
            class="completed-open-button task-name--done"
            @click="openTask(task.id)"
          >
            {{ task.name }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.completed-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem;
}

.completed-content {
  position: relative;
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 32rem;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: #1a1a1a;
}

.completed-content h2 {
  margin: 0 2rem 1rem 0;
  font-size: 1.2rem;
}

.close-button {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: #1a1a1a;
  padding: 0.25rem;
}

.completed-empty {
  margin: 0;
  color: #1a1a1a;
}

.completed-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.completed-checkbox {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
}

.completed-open-button {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
}

.task-name--done {
  text-decoration: line-through;
  color: #767676;
}

@media (max-width: 640px) {
  .completed-content {
    width: calc(100% - 2rem);
    box-sizing: border-box;
  }

  .close-button {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .completed-open-button {
    min-height: 44px;
  }

  .completed-checkbox {
    width: 44px;
    height: 44px;
  }
}
</style>
