<script setup lang="ts">
import { useCelebration } from '../composables/useCelebration'

const { confettiPieces, confettiBurstId } = useCelebration()
</script>

<template>
  <div
    v-if="confettiPieces.length"
    class="confetti-layer"
    aria-hidden="true"
    data-testid="confetti-layer"
  >
    <span
      v-for="piece in confettiPieces"
      :key="`${confettiBurstId}-${piece.id}`"
      class="confetti-piece"
      :class="{ 'confetti-piece--circle': piece.shape === 'circle' }"
      :style="{
        '--left': `${piece.left}%`,
        '--delay': `${piece.delay}s`,
        '--duration': `${piece.duration}s`,
        '--drift': `${piece.drift}px`,
        '--rot': `${piece.rotation}deg`,
        width: `${piece.size}px`,
        height: `${piece.size * (piece.shape === 'rect' ? 1.6 : 1)}px`,
        background: piece.color,
      }"
    ></span>
  </div>
</template>

<style scoped>
.confetti-layer {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 40;
}

.confetti-piece {
  position: absolute;
  top: 0;
  left: var(--left);
  opacity: 1;
  transform: translateY(-10vh);
  animation: confetti-fall var(--duration) var(--delay) ease-in both;
}

.confetti-piece--circle {
  border-radius: 50%;
}

@keyframes confetti-fall {
  from {
    transform: translate(0, -10vh) rotate(var(--rot));
  }
  to {
    transform: translate(var(--drift), 110vh) rotate(calc(var(--rot) + 540deg));
  }
}

@media (prefers-reduced-motion: reduce) {
  .confetti-layer {
    display: none;
  }
}
</style>
