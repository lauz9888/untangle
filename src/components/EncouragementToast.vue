<script setup>
import { useEncouragement } from '../composables/useEncouragement.js'

const { encouragement, dismissEncouragement } = useEncouragement()
</script>

<template>
  <Transition name="encouragement">
    <div v-if="encouragement" class="encouragement-toast" data-testid="encouragement-toast" @click="dismissEncouragement">
      <p class="encouragement-text" data-testid="encouragement-text">{{ encouragement }}</p>
    </div>
  </Transition>
  <div class="sr-live" role="status" aria-live="polite" aria-atomic="true">
    {{ encouragement || '' }}
  </div>
</template>

<style scoped>
.encouragement-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 20px 28px;
  max-width: min(440px, calc(100vw - 40px));
  width: max-content;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  z-index: 9998;
}

.encouragement-text {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--text-h);
  margin: 0;
  letter-spacing: -0.1px;
}

.sr-live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.encouragement-enter-active {
  transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.encouragement-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.encouragement-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

.encouragement-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
