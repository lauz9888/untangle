<script setup>
import { useToughLove } from '../composables/useToughLove.js'

const { toughLove, dismissToughLove } = useToughLove()
</script>

<template>
  <Transition name="tough-love">
    <div
      v-if="toughLove"
      class="tough-love-toast"
      data-testid="tough-love-toast"
      @click="dismissToughLove"
    >
      <p class="tough-love-text" data-testid="tough-love-text">{{ toughLove }}</p>
    </div>
  </Transition>
  <div class="sr-live" role="status" aria-live="polite" aria-atomic="true">
    {{ toughLove || '' }}
  </div>
</template>

<style scoped>
.tough-love-toast {
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
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  z-index: 9998;
}

.tough-love-text {
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

.tough-love-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tough-love-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.tough-love-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

.tough-love-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
