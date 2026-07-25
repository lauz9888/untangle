import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'
import { axe } from 'jest-axe'
import EnergySelector from '../../../src/components/EnergySelector.vue'
import EncourageButton from '../../../src/components/EncourageButton.vue'
import ToughLoveButton from '../../../src/components/ToughLoveButton.vue'
import ToastNotification from '../../../src/components/ToastNotification.vue'
import App from '../../../src/App.vue'

// toHaveNoViolations matcher is registered globally in vitest.setup.ts.
// Mirrors .claude/STANDARDS.md's WCAG conformance scope.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// jsdom has no real rendering engine to evaluate color-contrast against;
// that check is covered at the e2e layer (tests/e2e/a11y.spec.ts) instead.
async function expectNoAxeViolations(root: Element) {
  const results = await axe(root, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(results).toHaveNoViolations()
}

const state = {
  selectedLevel: ref<'low' | 'medium' | 'high' | null>(null),
  toastMessage: ref<string | null>(null),
  toastId: ref(0),
  selectLevel: vi.fn(),
  dismissToast: vi.fn(),
  encourageMe: vi.fn(),
  toughLove: vi.fn(),
}

vi.mock('../../../src/composables/useEnergyLevel', () => ({
  useEnergyLevel: () => state,
}))

let mountedWrappers: VueWrapper[] = []

function mountTracked(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  state.selectedLevel.value = null
  state.toastMessage.value = null
  state.toastId.value = 0
  state.selectLevel.mockReset()
  state.dismissToast.mockReset()
  state.encourageMe.mockReset()
  state.toughLove.mockReset()
})

afterEach(() => {
  mountedWrappers.forEach((wrapper) => wrapper.unmount())
  mountedWrappers = []
})

describe('EnergySelector', () => {
  it('renders Low, Medium and High options', () => {
    const wrapper = mountTracked(EnergySelector)
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels).toEqual(['Low', 'Medium', 'High'])
  })

  it('calls selectLevel with the matching value when a button is clicked', async () => {
    const wrapper = mountTracked(EnergySelector)
    const buttons = wrapper.findAll('button')

    await buttons[0]!.trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('low')

    await buttons[1]!.trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('medium')

    await buttons[2]!.trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('high')
  })

  it('marks the currently selected level as pressed and leaves the others unpressed', () => {
    state.selectedLevel.value = 'medium'
    const wrapper = mountTracked(EnergySelector)
    const buttons = wrapper.findAll('button')

    expect(buttons[0]!.attributes('aria-pressed')).toBe('false')
    expect(buttons[1]!.attributes('aria-pressed')).toBe('true')
    expect(buttons[2]!.attributes('aria-pressed')).toBe('false')
  })

  it('leaves every option unpressed when no level is selected', () => {
    const wrapper = mountTracked(EnergySelector)
    wrapper.findAll('button').forEach((button) => {
      expect(button.attributes('aria-pressed')).toBe('false')
    })
  })

  it('has no accessibility violations, unselected or with a level selected', async () => {
    const unselected = mountTracked(EnergySelector)
    await expectNoAxeViolations(unselected.element)

    state.selectedLevel.value = 'medium'
    const selected = mountTracked(EnergySelector)
    await expectNoAxeViolations(selected.element)
  })
})

describe('EncourageButton', () => {
  it('renders a button labeled "Encourage me"', () => {
    const wrapper = mountTracked(EncourageButton)
    expect(wrapper.find('button').text()).toBe('Encourage me')
  })

  it('calls encourageMe when clicked', async () => {
    const wrapper = mountTracked(EncourageButton)

    await wrapper.find('button').trigger('click')

    expect(state.encourageMe).toHaveBeenCalled()
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(EncourageButton)
    await expectNoAxeViolations(wrapper.element)
  })
})

describe('ToughLoveButton', () => {
  it('renders a button labeled "Tough love"', () => {
    const wrapper = mountTracked(ToughLoveButton)
    expect(wrapper.find('button').text()).toBe('Tough love')
  })

  it('calls toughLove when clicked', async () => {
    const wrapper = mountTracked(ToughLoveButton)

    await wrapper.find('button').trigger('click')

    expect(state.toughLove).toHaveBeenCalled()
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(ToughLoveButton)
    await expectNoAxeViolations(wrapper.element)
  })
})

describe('ToastNotification', () => {
  it('renders nothing when there is no toast message', () => {
    const wrapper = mountTracked(ToastNotification)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('renders the toast message with a polite live region when one is set', () => {
    state.toastMessage.value = "You're doing just fine at this pace."
    const wrapper = mountTracked(ToastNotification)

    const toast = wrapper.find('[role="status"]')
    expect(toast.exists()).toBe(true)
    expect(toast.attributes('aria-live')).toBe('polite')
    expect(toast.text()).toContain("You're doing just fine at this pace.")
  })

  it('calls dismissToast when the close button is clicked', async () => {
    state.toastMessage.value = 'Small steps still count.'
    const wrapper = mountTracked(ToastNotification)

    await wrapper.find('button').trigger('click')

    expect(state.dismissToast).toHaveBeenCalled()
  })

  it('has no accessibility violations when shown', async () => {
    state.toastMessage.value = 'You are doing just fine.'
    const wrapper = mountTracked(ToastNotification)
    await expectNoAxeViolations(wrapper.element)
  })

  describe('auto-dismiss timer', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('automatically dismisses the toast a few seconds after it appears', () => {
      state.toastMessage.value = 'You are doing great.'
      state.toastId.value = 1
      mountTracked(ToastNotification)

      expect(state.dismissToast).not.toHaveBeenCalled()

      vi.advanceTimersByTime(10000)

      expect(state.dismissToast).toHaveBeenCalled()
    })

    it('restarts the auto-dismiss countdown when a new toast replaces the current one', async () => {
      state.toastMessage.value = 'First message.'
      state.toastId.value = 1
      const wrapper = mountTracked(ToastNotification)

      vi.advanceTimersByTime(3000)
      expect(state.dismissToast).not.toHaveBeenCalled()

      state.toastMessage.value = 'Second message.'
      state.toastId.value = 2
      await wrapper.vm.$nextTick()

      vi.advanceTimersByTime(2000)
      expect(state.dismissToast).not.toHaveBeenCalled()

      vi.advanceTimersByTime(10000)
      expect(state.dismissToast).toHaveBeenCalledTimes(1)
    })

    it('does not fire a stray auto-dismiss after the toast has already been closed manually', async () => {
      state.toastMessage.value = 'Closed early.'
      state.toastId.value = 1
      const wrapper = mountTracked(ToastNotification)

      await wrapper.find('button').trigger('click')
      expect(state.dismissToast).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10000)
      expect(state.dismissToast).toHaveBeenCalledTimes(1)
    })
  })
})

describe('App', () => {
  it('renders the energy selector, encourage button, tough love button, and toast notification alongside the logo and tagline', () => {
    const wrapper = mountTracked(App)

    expect(wrapper.findComponent(EnergySelector).exists()).toBe(true)
    expect(wrapper.findComponent(EncourageButton).exists()).toBe(true)
    expect(wrapper.findComponent(ToughLoveButton).exists()).toBe(true)
    expect(wrapper.findComponent(ToastNotification).exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Untangle')
    expect(wrapper.find('.tagline').text()).toBe('Space to think')
  })

  it('places the encourage button immediately to the right of the energy selector, and the tough love button after that', () => {
    const wrapper = mountTracked(App)
    const actions = wrapper.find('.header-actions')
    const childClasses = Array.from(actions.element.children).map((el) => el.className)

    expect(childClasses[0]).toContain('energy-panel')
    expect(childClasses[1]).toContain('encourage-button')
    expect(childClasses[2]).toContain('tough-love-button')
  })

  it('has no accessibility violations', async () => {
    const wrapper = mountTracked(App)
    await expectNoAxeViolations(wrapper.element)
  })
})
