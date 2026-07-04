<script setup>
import { watch, onUnmounted } from 'vue'
import { useEnergyLevel } from '../composables/useEnergyLevel.js'

const AUTO_DISMISS_MS = 4500

const { toastMessage, toastId, dismissToast } = useEnergyLevel()

let timeoutId = null

function clearPendingDismiss() {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

watch(
  toastId,
  () => {
    clearPendingDismiss()
    if (toastMessage.value !== null) {
      timeoutId = setTimeout(dismissToast, AUTO_DISMISS_MS)
    }
  },
  { immediate: true }
)

onUnmounted(clearPendingDismiss)

function handleClose() {
  clearPendingDismiss()
  dismissToast()
}
</script>

<template>
  <div v-if="toastMessage" class="toast" role="status" aria-live="polite">
    <p class="toast-message">{{ toastMessage }}</p>
    <button type="button" class="toast-close" aria-label="Dismiss" @click="handleClose">
      &times;
    </button>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 2rem;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 24rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #1a1a1a;
  color: #fff;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.9rem;
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.2);
}

.toast-message {
  margin: 0;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .toast {
    width: calc(100% - 2rem);
    box-sizing: border-box;
    justify-content: space-between;
  }

  .toast-close {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
