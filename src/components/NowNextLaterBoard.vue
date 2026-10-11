<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import {
  useSectionCollapse,
  SECTION_DEFS,
  type SectionKey,
} from '../composables/useSectionCollapse'
import { useTasks, type Task } from '../composables/useTasks'
import { useTaskDetail } from '../composables/useTaskDetail'
import { useCelebration } from '../composables/useCelebration'
import { groupActiveTasksBySection, type FocusTarget } from '../composables/useBoardOrdering'

const { expanded, toggle } = useSectionCollapse()
const { tasks } = useTasks()
const { toggleTaskDoneWithCelebration, consumeCompletionFocusTarget } = useCelebration()
const {
  open: openDetail,
  isOpen: isTaskDetailOpen,
  openedFrom,
  lastOpenedTaskId,
  lastOpenedTaskSection,
} = useTaskDetail()

const tasksBySection = computed<Record<SectionKey, Task[]>>(() =>
  groupActiveTasksBySection(tasks.value)
)

// Local, non-reactive map of task id -> rendered open-button element, used only for the
// focus-return watcher below. Vue's :ref callback fires with null on unmount, which deletes a
// removed task's entry for us.
const taskButtonRefs = new Map<number, HTMLElement>()

function setTaskButtonRef(id: number, el: HTMLElement | null) {
  if (el) {
    taskButtonRefs.set(id, el)
  } else {
    taskButtonRefs.delete(id)
  }
}

function focusTarget(target: FocusTarget | null) {
  if (!target) return
  if (target.kind === 'task') {
    taskButtonRefs.get(target.id)?.focus()
  } else {
    document.getElementById(`section-${target.key}-heading`)?.focus()
  }
}

function onBoardToggle(id: number) {
  toggleTaskDoneWithCelebration(id)
  const target = consumeCompletionFocusTarget()
  nextTick(() => focusTarget(target))
}

watch(isTaskDetailOpen, (open, wasOpen) => {
  if (wasOpen && !open && openedFrom.value === 'board') {
    nextTick(() => {
      const target = consumeCompletionFocusTarget()
      if (target) {
        focusTarget(target)
        return
      }
      const button =
        lastOpenedTaskId.value !== null ? taskButtonRefs.get(lastOpenedTaskId.value) : null
      if (button) {
        button.focus()
        return
      }
      const fallbackSection = lastOpenedTaskSection.value
      if (fallbackSection) {
        document.getElementById(`section-${fallbackSection}-heading`)?.focus()
      }
    })
  }
})
</script>

<template>
  <div class="now-next-later-board">
    <CollapsibleSection
      v-for="section in SECTION_DEFS"
      :key="section.key"
      :section-key="section.key"
      :label="section.label"
      :expanded="expanded[section.key]"
      @toggle="toggle(section.key)"
    >
      <ul v-if="tasksBySection[section.key].length > 0" class="task-list">
        <li v-for="task in tasksBySection[section.key]" :key="task.id" class="task-item">
          <input
            :id="`task-${task.id}-done`"
            type="checkbox"
            class="task-done-checkbox"
            :aria-label="task.name"
            @change="onBoardToggle(task.id)"
          />
          <button
            :ref="(el) => setTaskButtonRef(task.id, el as HTMLElement | null)"
            type="button"
            class="task-open-button task-name"
            @click="openDetail(task.id)"
          >
            {{ task.name }}
          </button>
        </li>
      </ul>
    </CollapsibleSection>
  </div>
</template>

<style scoped>
.now-next-later-board {
  display: flex;
  flex-direction: row; /* desktop-first: columns, Requirement 3 */
  gap: 1rem;
  margin-top: 6rem; /* clears the absolutely-positioned .brand header at >640px — implementer:
                        verify visually against actual rendered header height, including the
                        case where .header-actions wraps to a second line on narrower desktop
                        widths (~641–900px); adjust this value if the header overlaps content */
  padding: 0 1.5rem 1.5rem;
}
.now-next-later-board > * {
  flex: 1 1 0;
  min-width: 0;
}
.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.task-done-checkbox {
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
}
.task-name {
  color: #1a1a1a;
  font-size: 0.95rem;
  cursor: pointer;
}
.task-open-button {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  text-align: left;
}
@media (max-width: 640px) {
  .now-next-later-board {
    flex-direction: column; /* rows, Requirement 4 */
    margin-top: 1rem; /* .brand is position: static at this breakpoint and already occupies
                          flow space, so only a small gap is needed here */
  }
  .task-item {
    min-height: 44px;
  }
  .task-done-checkbox {
    /* ~44px minimum tap target convention (see AddTaskModal.vue's .close-button etc.) —
       1.5rem (24px) alone is too small a hit area for the actual interactive control,
       even though the surrounding .task-item row is already 44px tall. */
    width: 44px;
    height: 44px;
  }
}
</style>
