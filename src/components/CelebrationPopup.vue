<script setup>
import { useCelebration } from '../composables/useCelebration.js'

const { popup, dismiss } = useCelebration()
</script>

<template>
  <Transition name="celebration">
    <div v-if="popup" class="celebration-overlay" data-testid="celebration-overlay" @click="dismiss">
      <div class="celebration-popup" data-testid="celebration-popup">
        <p class="celebration-text" data-testid="celebration-text">{{ popup }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.celebration-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  cursor: pointer;
}

.celebration-popup {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 48px 56px;
  max-width: min(560px, calc(100vw - 48px));
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  pointer-events: none;
}

.celebration-text {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-h);
  letter-spacing: -0.5px;
  margin: 0;
}

.celebration-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.celebration-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.celebration-enter-from {
  opacity: 0;
  transform: scale(0.88);
}

.celebration-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
