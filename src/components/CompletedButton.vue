<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useCompletedPanel } from '../composables/useCompletedPanel'

const { isOpen, completedCount, open } = useCompletedPanel()

const buttonRef = ref<HTMLButtonElement | null>(null)

watch(isOpen, (now, was) => {
  if (was && !now) {
    nextTick(() => buttonRef.value?.focus())
  }
})
</script>

<template>
  <button
    ref="buttonRef"
    type="button"
    class="completed-button"
    aria-haspopup="dialog"
    @click="open"
  >
    Completed ({{ completedCount }})
  </button>
</template>

<style scoped>
.completed-button {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.completed-button:hover {
  border-color: #a8a8a8;
}

.completed-button:focus-visible {
  outline: 2px solid #1a1a1a;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .completed-button {
    min-height: 44px;
    padding: 0.6rem 1rem;
  }
}
</style>
