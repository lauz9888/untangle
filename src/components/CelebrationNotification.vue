<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useCelebration } from '../composables/useCelebration'

const { celebrationMessage, celebrationId, dismissCelebration, pauseDismiss, resumeDismiss } =
  useCelebration()

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const cardRef = ref<HTMLElement | null>(null)
const hovered = ref(false)
const focused = ref(false)
let previouslyFocused: HTMLElement | null = null

function resumeIfIdle() {
  if (!hovered.value && !focused.value) {
    resumeDismiss()
  }
}

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  hovered.value = true
  pauseDismiss()
}

function onPointerLeave(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  hovered.value = false
  resumeIfIdle()
}

function onFocusIn(event: FocusEvent) {
  focused.value = true
  pauseDismiss()
  const related = event.relatedTarget
  if (related instanceof HTMLElement && !cardRef.value?.contains(related)) {
    previouslyFocused = related
  }
}

function onFocusOut(event: FocusEvent) {
  const related = event.relatedTarget
  if (related instanceof Node && cardRef.value?.contains(related)) {
    return
  }
  focused.value = false
  resumeIfIdle()
}

watch(celebrationMessage, (message) => {
  if (message === null) {
    hovered.value = false
    focused.value = false
    previouslyFocused = null
  }
})

watch(celebrationId, () => {
  if (hovered.value || focused.value) {
    pauseDismiss()
  }
})

function topmostDialog(): HTMLElement | null {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="alertdialog"], [role="dialog"]')
  ).filter((el) => !el.closest('[inert]'))
  return dialogs.length > 0 ? dialogs[dialogs.length - 1]! : null
}

async function onDismissClick() {
  const hadFocus = cardRef.value?.contains(document.activeElement) ?? false
  const prev = previouslyFocused
  dismissCelebration()
  if (!hadFocus) return
  await nextTick()

  const top = topmostDialog()
  if (top) {
    if (prev && prev.isConnected && top.contains(prev)) {
      prev.focus()
    } else if (top.getAttribute('role') === 'alertdialog') {
      top.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    } else {
      top.querySelector<HTMLElement>('.close-button')?.focus()
    }
    return
  }
  if (prev && prev.isConnected) {
    prev.focus()
  } else {
    document.querySelector<HTMLElement>('main')?.focus()
  }
}
</script>

<template>
  <div class="celebration-region" role="status" aria-live="polite" aria-atomic="true">
    <div
      v-if="celebrationMessage"
      ref="cardRef"
      class="celebration"
      data-testid="celebration"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
    >
      <p class="celebration-message">{{ celebrationMessage }}</p>
      <button
        type="button"
        class="celebration-close"
        aria-label="Dismiss celebration"
        @click="onDismissClick"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.celebration-region {
  position: fixed;
  top: max(1rem, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: none;
  max-width: 24rem;
  width: max-content;
}

.celebration {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: #1a1a1a;
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.celebration-message {
  margin: 0;
}

.celebration-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem;
  flex-shrink: 0;
}

.celebration-close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .celebration-region {
    left: 4.5rem;
    right: 4.5rem;
    width: auto;
    transform: none;
  }

  .celebration {
    box-sizing: border-box;
    justify-content: space-between;
  }

  .celebration-close {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
