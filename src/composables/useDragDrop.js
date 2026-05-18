import { ref, onBeforeUnmount, getCurrentInstance } from 'vue'
import { useTasks } from './useTasks.js'

// Shared drag state so multiple components can coordinate touch drag.
export const activeTouchDragId = ref(null)

export function useTaskDrag(taskId, cardEl, editing) {
  const { moveTaskToColumn } = useTasks()

  const isDragging = ref(false)
  const isTouchDragging = ref(false)
  let ghostEl = null
  let ghostOffsetX = 0
  let ghostOffsetY = 0
  let touchStartX = 0
  let touchStartY = 0

  // ── HTML5 drag (desktop mouse) ──────────────────────────────────────────────

  function onDragStart(e) {
    isDragging.value = true
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragEnd() {
    isDragging.value = false
  }

  // ── Touch drag ──────────────────────────────────────────────────────────────

  function handleTouchStart(e) {
    if (editing.value || activeTouchDragId.value) return
    const touch = e.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchCancel)
  }

  function handleTouchMove(e) {
    const touch = e.touches[0]
    if (!isTouchDragging.value) {
      if (activeTouchDragId.value) return
      const dx = Math.abs(touch.clientX - touchStartX)
      const dy = Math.abs(touch.clientY - touchStartY)
      if (dx < 8 && dy < 8) return
      startTouchDrag(touch)
    }
    if (isTouchDragging.value) {
      e.preventDefault()
      if (ghostEl) {
        ghostEl.style.left = (touch.clientX - ghostOffsetX) + 'px'
        ghostEl.style.top = (touch.clientY - ghostOffsetY) + 'px'
      }
    }
  }

  function handleTouchEnd(e) {
    removeTouchListeners()
    if (!isTouchDragging.value) return
    const touch = e.changedTouches[0]
    dropTouchDrag(touch.clientX, touch.clientY)
  }

  function handleTouchCancel() {
    removeTouchListeners()
    cleanupTouchDrag()
  }

  function removeTouchListeners() {
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchCancel)
  }

  function startTouchDrag(touch) {
    isTouchDragging.value = true
    isDragging.value = true
    activeTouchDragId.value = taskId
    const rect = cardEl.value.getBoundingClientRect()
    ghostOffsetX = touch.clientX - rect.left
    ghostOffsetY = touch.clientY - rect.top
    ghostEl = cardEl.value.cloneNode(true)
    Object.assign(ghostEl.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      opacity: '0.85',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'rotate(1.5deg) scale(1.03)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      transition: 'none',
      margin: '0',
    })
    document.body.appendChild(ghostEl)
  }

  function dropTouchDrag(x, y) {
    if (ghostEl) { ghostEl.remove(); ghostEl = null }
    isTouchDragging.value = false
    isDragging.value = false
    activeTouchDragId.value = null
    const elements = document.elementsFromPoint(x, y)
    const columnEl = elements.find(el => el.dataset?.column)
    if (columnEl) moveTaskToColumn(taskId, columnEl.dataset.column)
  }

  function cleanupTouchDrag() {
    if (ghostEl) { ghostEl.remove(); ghostEl = null }
    isTouchDragging.value = false
    isDragging.value = false
    activeTouchDragId.value = null
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      removeTouchListeners()
      cleanupTouchDrag()
    })
  }

  return { isDragging, onDragStart, onDragEnd, handleTouchStart }
}
