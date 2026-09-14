<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useAddTaskModal } from '../composables/useAddTaskModal'
import { useFocusTrap } from '../composables/useFocusTrap'

const { isConfirmOpen, confirmDiscard, cancelDiscard } = useAddTaskModal()

const contentRef = ref<HTMLElement | null>(null)
const noButtonRef = ref<HTMLButtonElement | null>(null)

const { handleKeydown } = useFocusTrap(contentRef)

function onTrapKeydown(event: KeyboardEvent) {
  handleKeydown(event)
}

onMounted(() => {
  nextTick(() => {
    noButtonRef.value?.focus()
  })
})
</script>

<template>
  <div
    v-if="isConfirmOpen"
    class="close-confirm-overlay"
    tabindex="-1"
    @keydown.stop
    @keydown.esc="cancelDiscard"
    @keydown="onTrapKeydown"
  >
    <div
      ref="contentRef"
      class="close-confirm-content"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="close-confirm-heading"
    >
      <h2 id="close-confirm-heading">Close without saving?</h2>
      <div class="close-confirm-actions">
        <button ref="noButtonRef" type="button" class="no-button" @click="cancelDiscard">No</button>
        <button type="button" class="yes-button" @click="confirmDiscard">Yes</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.close-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.close-confirm-content {
  background: #fff;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 24rem;
  width: 90%;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.close-confirm-content h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #1a1a1a;
}

.close-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.no-button,
.yes-button {
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.5rem 1.1rem;
  border-radius: 0.4rem;
  border: 1px solid #d6d6d6;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
}

.yes-button {
  background: #1a1a1a;
  border-color: #1a1a1a;
  color: #fff;
}

@media (max-width: 640px) {
  .no-button,
  .yes-button {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
