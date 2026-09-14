<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAddTaskModal } from '../composables/useAddTaskModal'

const { isOpen, openModal } = useAddTaskModal()

const buttonRef = ref<HTMLButtonElement | null>(null)

watch(isOpen, (open, wasOpen) => {
  if (wasOpen && !open) {
    buttonRef.value?.focus()
  }
})
</script>

<template>
  <button
    ref="buttonRef"
    type="button"
    class="add-task-button"
    aria-label="Add task"
    @click="openModal"
  >
    <span aria-hidden="true">+</span>
  </button>
</template>

<style scoped>
.add-task-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border-radius: 999px;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.add-task-button:hover {
  border-color: #a8a8a8;
}

@media (max-width: 640px) {
  .add-task-button {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
