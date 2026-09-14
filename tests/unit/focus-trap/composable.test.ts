import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useFocusTrap } from '../../../src/composables/useFocusTrap'

function makeContainerWithFocusables(count: number) {
  const container = document.createElement('div')
  const buttons: HTMLButtonElement[] = []
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button')
    button.textContent = `button-${i}`
    container.appendChild(button)
    buttons.push(button)
  }
  document.body.appendChild(container)
  return { container, buttons }
}

function keydownEvent(key: string, shiftKey = false) {
  return {
    key,
    shiftKey,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('Tab on the last focusable element wraps focus to the first', () => {
    const { container, buttons } = makeContainerWithFocusables(3)
    buttons[2]!.focus()
    const focusSpy = vi.spyOn(buttons[0]!, 'focus')
    const containerRef = ref<HTMLElement | null>(container)

    const { handleKeydown } = useFocusTrap(containerRef)
    const event = keydownEvent('Tab')
    handleKeydown(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(focusSpy).toHaveBeenCalled()
  })

  it('Shift+Tab on the first focusable element wraps focus to the last', () => {
    const { container, buttons } = makeContainerWithFocusables(3)
    buttons[0]!.focus()
    const focusSpy = vi.spyOn(buttons[2]!, 'focus')
    const containerRef = ref<HTMLElement | null>(container)

    const { handleKeydown } = useFocusTrap(containerRef)
    const event = keydownEvent('Tab', true)
    handleKeydown(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(focusSpy).toHaveBeenCalled()
  })

  it('ignores non-Tab keys entirely', () => {
    const { container, buttons } = makeContainerWithFocusables(3)
    buttons[0]!.focus()
    const focusSpy = vi.spyOn(buttons[2]!, 'focus')
    const containerRef = ref<HTMLElement | null>(container)

    const { handleKeydown } = useFocusTrap(containerRef)
    const event = keydownEvent('Escape')
    handleKeydown(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('fully prevents Tab when there are zero focusable elements, without attempting a focus change', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const containerRef = ref<HTMLElement | null>(container)

    const { handleKeydown } = useFocusTrap(containerRef)
    const event = keydownEvent('Tab')

    expect(() => handleKeydown(event)).not.toThrow()
    expect(event.preventDefault).toHaveBeenCalled()
  })
})
