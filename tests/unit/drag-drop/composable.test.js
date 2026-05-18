import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'

const mockMoveTaskToColumn = vi.fn()

vi.mock('../../../src/composables/useTasks.js', () => ({
  useTasks: () => ({ moveTaskToColumn: mockMoveTaskToColumn }),
}))

// Imported after mock so the module picks up the stub above.
import { useTaskDrag, activeTouchDragId } from '../../../src/composables/useDragDrop.js'

function makeCardEl() {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ left: 10, top: 20, width: 200, height: 60 })
  el.cloneNode = () => {
    const clone = document.createElement('div')
    clone.style = el.style
    return clone
  }
  return ref(el)
}

function makeDragEvent(overrides = {}) {
  return {
    dataTransfer: { setData: vi.fn(), effectAllowed: null },
    ...overrides,
  }
}

function makeTouchEvent(x, y, type = 'touchstart') {
  const touch = { clientX: x, clientY: y }
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    touches: [touch],
    changedTouches: [touch],
    preventDefault: vi.fn(),
  })
}

describe('useTaskDrag — HTML5 drag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeTouchDragId.value = null
  })

  it('sets isDragging and populates dataTransfer on dragstart', () => {
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { isDragging, onDragStart } = useTaskDrag('task-1', cardEl, editing)

    const event = makeDragEvent()
    onDragStart(event)

    expect(isDragging.value).toBe(true)
    expect(event.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'task-1')
    expect(event.dataTransfer.effectAllowed).toBe('move')
  })

  it('clears isDragging on dragend', () => {
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { isDragging, onDragStart, onDragEnd } = useTaskDrag('task-1', cardEl, editing)

    onDragStart(makeDragEvent())
    expect(isDragging.value).toBe(true)
    onDragEnd()
    expect(isDragging.value).toBe(false)
  })
})

describe('useTaskDrag — touch drag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeTouchDragId.value = null
  })

  afterEach(() => {
    // Clean up any ghost elements left by the drag logic.
    document.querySelectorAll('body > div').forEach(el => el.remove())
  })

  it('does not start drag when editing', () => {
    const cardEl = makeCardEl()
    const editing = ref(true)
    const { isDragging, handleTouchStart } = useTaskDrag('task-2', cardEl, editing)

    handleTouchStart(makeTouchEvent(50, 50))
    // Move far enough to trigger a drag — if editing guard works, nothing happens.
    const moveEvent = makeTouchEvent(100, 100, 'touchmove')
    document.dispatchEvent(moveEvent)

    expect(isDragging.value).toBe(false)
  })

  it('does not start drag when another touch drag is already active', () => {
    activeTouchDragId.value = 'other-task'
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { isDragging, handleTouchStart } = useTaskDrag('task-3', cardEl, editing)

    handleTouchStart(makeTouchEvent(50, 50))
    expect(isDragging.value).toBe(false)
  })

  it('starts drag after moving past the 8px threshold', () => {
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { isDragging, handleTouchStart } = useTaskDrag('task-4', cardEl, editing)

    handleTouchStart(makeTouchEvent(50, 50))

    // Within threshold — no drag yet.
    document.dispatchEvent(makeTouchEvent(54, 53, 'touchmove'))
    expect(isDragging.value).toBe(false)

    // Past threshold in X.
    document.dispatchEvent(makeTouchEvent(60, 50, 'touchmove'))
    expect(isDragging.value).toBe(true)
    expect(activeTouchDragId.value).toBe('task-4')
  })

  it('appends a ghost element to the body during drag', () => {
    const cardEl = makeCardEl()
    document.body.appendChild(cardEl.value)
    const editing = ref(false)
    const { handleTouchStart } = useTaskDrag('task-5', cardEl, editing)

    handleTouchStart(makeTouchEvent(50, 50))
    document.dispatchEvent(makeTouchEvent(70, 50, 'touchmove'))

    expect(document.body.querySelectorAll('div').length).toBeGreaterThan(0)
    document.body.removeChild(cardEl.value)
  })

  it('calls moveTaskToColumn with the target column on touchend', () => {
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { handleTouchStart } = useTaskDrag('task-6', cardEl, editing)

    // Create a column drop target.
    const columnEl = document.createElement('div')
    columnEl.dataset.column = 'next'
    document.body.appendChild(columnEl)

    // jsdom doesn't implement elementsFromPoint — define it so spyOn can stub it.
    document.elementsFromPoint = () => []
    vi.spyOn(document, 'elementsFromPoint').mockReturnValue([columnEl])

    handleTouchStart(makeTouchEvent(50, 50))
    document.dispatchEvent(makeTouchEvent(70, 50, 'touchmove'))
    document.dispatchEvent(makeTouchEvent(70, 50, 'touchend'))

    expect(mockMoveTaskToColumn).toHaveBeenCalledWith('task-6', 'next')
    expect(activeTouchDragId.value).toBeNull()

    document.body.removeChild(columnEl)
    vi.restoreAllMocks()
  })

  it('cleans up state on touchcancel', () => {
    const cardEl = makeCardEl()
    const editing = ref(false)
    const { isDragging, handleTouchStart } = useTaskDrag('task-7', cardEl, editing)

    handleTouchStart(makeTouchEvent(50, 50))
    document.dispatchEvent(makeTouchEvent(70, 50, 'touchmove'))
    expect(isDragging.value).toBe(true)

    document.dispatchEvent(new Event('touchcancel', { bubbles: true }))
    expect(isDragging.value).toBe(false)
    expect(activeTouchDragId.value).toBeNull()
  })
})
