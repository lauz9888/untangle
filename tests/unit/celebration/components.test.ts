import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { axe } from 'jest-axe'
import CelebrationNotification from '../../../src/components/CelebrationNotification.vue'
import ConfettiLayer from '../../../src/components/ConfettiLayer.vue'

// toHaveNoViolations matcher is registered globally in vitest.setup.ts.
// Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// jsdom has no real rendering engine to evaluate color-contrast against;
// that check is covered at the e2e/Storybook layers instead.
async function expectNoAxeViolations(root: Element) {
  const results = await axe(root, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results).toHaveNoViolations()
}

interface FakePiece {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  color: string
  rotation: number
  drift: number
  shape: 'rect' | 'circle'
}

function makePieces(n: number): FakePiece[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: (i * 7) % 100,
    delay: 0.1,
    duration: 3,
    size: 8,
    color: '#e63946',
    rotation: 45,
    drift: 10,
    shape: i % 2 === 0 ? 'rect' : 'circle',
  }))
}

const state = {
  celebrationMessage: ref<string | null>(null),
  celebrationId: ref(0),
  confettiPieces: ref<FakePiece[]>([]),
  confettiBurstId: ref(0),
  completionFocusTarget: ref(null),
  celebrate: vi.fn(),
  dismissCelebration: vi.fn(),
  pauseDismiss: vi.fn(),
  resumeDismiss: vi.fn(),
  consumeCompletionFocusTarget: vi.fn(),
  toggleTaskDoneWithCelebration: vi.fn(),
}

vi.mock('../../../src/composables/useCelebration', () => ({
  useCelebration: () => state,
}))

let mountedWrappers: VueWrapper[] = []
let extraNodes: HTMLElement[] = []

function mountTracked(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

function addNode(html: string): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = html
  const node = container.firstElementChild as HTMLElement
  document.body.appendChild(node)
  extraNodes.push(node)
  return node
}

beforeEach(() => {
  state.celebrationMessage.value = null
  state.celebrationId.value = 0
  state.confettiPieces.value = []
  state.confettiBurstId.value = 0
  state.celebrate.mockReset()
  state.dismissCelebration.mockReset()
  state.dismissCelebration.mockImplementation(() => {
    state.celebrationMessage.value = null
  })
  state.pauseDismiss.mockReset()
  state.resumeDismiss.mockReset()
  state.consumeCompletionFocusTarget.mockReset()
  state.toggleTaskDoneWithCelebration.mockReset()
})

afterEach(() => {
  mountedWrappers.forEach((w) => w.unmount())
  mountedWrappers = []
  extraNodes.forEach((n) => n.remove())
  extraNodes = []
  ;(document.activeElement as HTMLElement | null)?.blur?.()
})

describe('CelebrationNotification', () => {
  it('renders a persistent polite status live region with no card when there is no message', () => {
    const wrapper = mountTracked(CelebrationNotification)
    const region = wrapper.find('[role="status"]')
    expect(region.exists()).toBe(true)
    expect(region.attributes('aria-live')).toBe('polite')
    expect(region.attributes('aria-atomic')).toBe('true')
    expect(wrapper.find('[data-testid="celebration"]').exists()).toBe(false)
  })

  it('shows the card, message text and a labelled close button when a message is set', async () => {
    const wrapper = mountTracked(CelebrationNotification)
    state.celebrationMessage.value = 'Nicely done.'
    await nextTick()

    const region = wrapper.find('[role="status"]')
    expect(region.find('[data-testid="celebration"]').exists()).toBe(true)
    expect(region.text()).toContain('Nicely done.')
    const close = region.find('button.celebration-close')
    expect(close.attributes('aria-label')).toBe('Dismiss celebration')
    expect(close.attributes('type')).toBe('button')
  })

  it('clicking close calls dismissCelebration', async () => {
    state.celebrationMessage.value = 'Nicely done.'
    const wrapper = mountTracked(CelebrationNotification)
    await wrapper.find('button.celebration-close').trigger('click')
    expect(state.dismissCelebration).toHaveBeenCalled()
  })

  it('does not read from or write to the energy-level toast (no useEnergyLevel import needed)', () => {
    const wrapper = mountTracked(CelebrationNotification)
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  describe('pause / resume', () => {
    async function mountWithMessage() {
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      return wrapper
    }

    it('mouse pointerenter pauses and pointerleave resumes', async () => {
      const wrapper = await mountWithMessage()
      const card = wrapper.find('[data-testid="celebration"]')
      await card.trigger('pointerenter', { pointerType: 'mouse' })
      expect(state.pauseDismiss).toHaveBeenCalledTimes(1)
      await card.trigger('pointerleave', { pointerType: 'mouse' })
      expect(state.resumeDismiss).toHaveBeenCalledTimes(1)
    })

    it.each(['touch', 'pen'])('%s pointer events neither pause nor resume', async (pointerType) => {
      const wrapper = await mountWithMessage()
      const card = wrapper.find('[data-testid="celebration"]')
      await card.trigger('pointerenter', { pointerType })
      await card.trigger('pointerleave', { pointerType })
      expect(state.pauseDismiss).not.toHaveBeenCalled()
      expect(state.resumeDismiss).not.toHaveBeenCalled()
    })

    it('focusin pauses; focusout leaving the card resumes', async () => {
      const wrapper = await mountWithMessage()
      const card = wrapper.find('[data-testid="celebration"]')
      await card.trigger('focusin')
      expect(state.pauseDismiss).toHaveBeenCalledTimes(1)
      await card.trigger('focusout', { relatedTarget: document.body })
      expect(state.resumeDismiss).toHaveBeenCalledTimes(1)
    })

    it('focus moving within the card does not resume', async () => {
      const wrapper = await mountWithMessage()
      const card = wrapper.find('[data-testid="celebration"]')
      const close = wrapper.find('button.celebration-close')
      await card.trigger('focusin')
      await card.trigger('focusout', { relatedTarget: close.element })
      expect(state.resumeDismiss).not.toHaveBeenCalled()
    })

    it('hovered AND focused: ending only one does not resume', async () => {
      const wrapper = await mountWithMessage()
      const card = wrapper.find('[data-testid="celebration"]')
      await card.trigger('pointerenter', { pointerType: 'mouse' })
      await card.trigger('focusin')
      await card.trigger('pointerleave', { pointerType: 'mouse' })
      expect(state.resumeDismiss).not.toHaveBeenCalled()
      await card.trigger('focusout', { relatedTarget: document.body })
      expect(state.resumeDismiss).toHaveBeenCalledTimes(1)
    })

    it('flags reset when the card is removed while hovered, so the next card resumes normally', async () => {
      const wrapper = await mountWithMessage()
      await wrapper.find('[data-testid="celebration"]').trigger('pointerenter', {
        pointerType: 'mouse',
      })
      state.celebrationMessage.value = null
      await nextTick()
      state.celebrationMessage.value = 'Another one.'
      await nextTick()
      state.resumeDismiss.mockReset()

      const card = wrapper.find('[data-testid="celebration"]')
      await card.trigger('focusin')
      await card.trigger('focusout', { relatedTarget: document.body })
      expect(state.resumeDismiss).toHaveBeenCalledTimes(1)
    })

    it('a replacement celebration while hovered re-pauses', async () => {
      const wrapper = await mountWithMessage()
      await wrapper.find('[data-testid="celebration"]').trigger('pointerenter', {
        pointerType: 'mouse',
      })
      state.pauseDismiss.mockReset()
      state.celebrationMessage.value = 'Replacement.'
      state.celebrationId.value += 1
      await nextTick()
      await nextTick()
      expect(state.pauseDismiss).toHaveBeenCalled()
    })
  })

  describe('manual dismiss focus restore', () => {
    async function setup() {
      const outside = addNode('<button id="outside" type="button">Outside</button>')
      outside.focus()
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      const close = wrapper.find('button.celebration-close')
      ;(close.element as HTMLElement).focus()
      await close.trigger('focusin', { relatedTarget: outside })
      return { wrapper, close, outside }
    }

    async function dismiss(close: { trigger: (e: string) => Promise<void> }) {
      await close.trigger('click')
      await nextTick()
      await nextTick()
    }

    it('no dialog open: returns focus to the previously focused element', async () => {
      const { close, outside } = await setup()
      await dismiss(close)
      expect(document.activeElement).toBe(outside)
    })

    it('no dialog open and previous element removed: focuses <main>', async () => {
      const main = addNode('<main tabindex="-1"></main>')
      const { close, outside } = await setup()
      outside.remove()
      await dismiss(close)
      expect(document.activeElement).toBe(main)
    })

    it('a role=dialog is open and the previous element is outside it: focuses its .close-button', async () => {
      const dialog = addNode(
        '<div role="dialog" aria-modal="true" aria-label="D"><button class="close-button" type="button">X</button><input /></div>'
      )
      const { close } = await setup()
      await dismiss(close)
      expect(document.activeElement).toBe(dialog.querySelector('.close-button'))
    })

    it('a role=dialog is open and the previous element is inside it: focuses the previous element', async () => {
      const dialog = addNode(
        '<div role="dialog" aria-modal="true" aria-label="D"><button class="close-button" type="button">X</button><input id="inner" /></div>'
      )
      const inner = dialog.querySelector('#inner') as HTMLElement
      inner.focus()
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      const close = wrapper.find('button.celebration-close')
      ;(close.element as HTMLElement).focus()
      await close.trigger('focusin', { relatedTarget: inner })
      await dismiss(close)
      expect(document.activeElement).toBe(inner)
    })

    it('a nested alertdialog is open: focuses the alertdialog first focusable, never the parent X', async () => {
      const dialog = addNode(
        '<div role="dialog" aria-modal="true" aria-label="D"><button class="close-button" type="button">X</button><div role="alertdialog" aria-label="Sure?"><button id="confirm" type="button">Confirm</button><button type="button">Cancel</button></div></div>'
      )
      const { close } = await setup()
      await dismiss(close)
      expect(document.activeElement).toBe(dialog.querySelector('#confirm'))
    })

    it('panel and Task Detail stacked: the inert panel is excluded and Task Detail receives focus', async () => {
      addNode(
        '<div inert><div role="dialog" aria-modal="true" aria-label="Panel"><button class="close-button" type="button">PX</button></div></div>'
      )
      const detail = addNode(
        '<div><div role="dialog" aria-modal="true" aria-label="Detail"><button class="close-button" type="button">DX</button></div></div>'
      )
      const { close } = await setup()
      await dismiss(close)
      expect(document.activeElement).toBe(detail.querySelector('.close-button'))
    })

    it('close clicked without focus inside the card leaves focus untouched', async () => {
      const outside = addNode('<button id="outside" type="button">Outside</button>')
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      outside.focus()
      await wrapper.find('button.celebration-close').trigger('click')
      await nextTick()
      await nextTick()
      expect(state.dismissCelebration).toHaveBeenCalled()
      expect(document.activeElement).toBe(outside)
    })
  })

  describe('accessibility', () => {
    it('has no violations with an empty live region', async () => {
      const wrapper = mountTracked(CelebrationNotification)
      await expectNoAxeViolations(wrapper.element)
    })

    it('has no violations with a message shown', async () => {
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      await expectNoAxeViolations(wrapper.element)
    })

    it('has no violations while the close button holds focus', async () => {
      state.celebrationMessage.value = 'Nicely done.'
      const wrapper = mountTracked(CelebrationNotification)
      await nextTick()
      ;(wrapper.find('button.celebration-close').element as HTMLElement).focus()
      await expectNoAxeViolations(wrapper.element)
    })
  })
})

describe('ConfettiLayer', () => {
  it('renders nothing when there are no pieces', () => {
    const wrapper = mountTracked(ConfettiLayer)
    expect(wrapper.find('[data-testid="confetti-layer"]').exists()).toBe(false)
    expect(wrapper.findAll('.confetti-piece')).toHaveLength(0)
  })

  it('renders N decorative pieces inside an aria-hidden container with no focusable descendants', async () => {
    state.confettiPieces.value = makePieces(12)
    state.confettiBurstId.value = 1
    const wrapper = mountTracked(ConfettiLayer)
    await nextTick()

    const layer = wrapper.find('[data-testid="confetti-layer"]')
    expect(layer.exists()).toBe(true)
    expect(layer.classes()).toContain('confetti-layer')
    expect(layer.attributes('aria-hidden')).toBe('true')
    expect(layer.findAll('span.confetti-piece')).toHaveLength(12)
    expect(
      layer.element.querySelectorAll('[tabindex], a, button, input, select, textarea')
    ).toHaveLength(0)
    expect(layer.text()).toBe('')
  })

  it('remounts every piece on a new burst even when piece ids repeat', async () => {
    state.confettiPieces.value = makePieces(5)
    state.confettiBurstId.value = 1
    const wrapper = mountTracked(ConfettiLayer)
    await nextTick()
    const previous = wrapper.findAll('.confetti-piece').map((p) => p.element)

    state.confettiPieces.value = makePieces(5)
    state.confettiBurstId.value = 2
    await nextTick()
    const next = wrapper.findAll('.confetti-piece').map((p) => p.element)

    expect(next).toHaveLength(5)
    next.forEach((el, i) => {
      expect(el).not.toBe(previous[i])
    })
    previous.forEach((el) => expect(el.isConnected).toBe(false))
  })

  it('has no accessibility violations with pieces in flight', async () => {
    state.confettiPieces.value = makePieces(8)
    state.confettiBurstId.value = 1
    const wrapper = mountTracked(ConfettiLayer)
    await nextTick()
    await expectNoAxeViolations(wrapper.element)
  })
})
