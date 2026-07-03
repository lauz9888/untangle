import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import EnergySelector from '../../../src/components/EnergySelector.vue'
import ToastNotification from '../../../src/components/ToastNotification.vue'
import App from '../../../src/App.vue'

const state = {
  selectedLevel: ref(null),
  toastMessage: ref(null),
  toastId: ref(0),
  selectLevel: vi.fn(),
  dismissToast: vi.fn(),
}

vi.mock('../../../src/composables/useEnergyLevel.js', () => ({
  useEnergyLevel: () => state,
}))

let mountedWrappers = []

function mountTracked(component) {
  const wrapper = mount(component)
  mountedWrappers.push(wrapper)
  return wrapper
}

beforeEach(() => {
  state.selectedLevel.value = null
  state.toastMessage.value = null
  state.toastId.value = 0
  state.selectLevel.mockReset()
  state.dismissToast.mockReset()
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

    await buttons[0].trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('low')

    await buttons[1].trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('medium')

    await buttons[2].trigger('click')
    expect(state.selectLevel).toHaveBeenCalledWith('high')
  })

  it('marks the currently selected level as pressed and leaves the others unpressed', () => {
    state.selectedLevel.value = 'medium'
    const wrapper = mountTracked(EnergySelector)
    const buttons = wrapper.findAll('button')

    expect(buttons[0].attributes('aria-pressed')).toBe('false')
    expect(buttons[1].attributes('aria-pressed')).toBe('true')
    expect(buttons[2].attributes('aria-pressed')).toBe('false')
  })

  it('leaves every option unpressed when no level is selected', () => {
    const wrapper = mountTracked(EnergySelector)
    wrapper.findAll('button').forEach((button) => {
      expect(button.attributes('aria-pressed')).toBe('false')
    })
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
  it('renders the energy selector and toast notification alongside the logo and tagline', () => {
    const wrapper = mountTracked(App)

    expect(wrapper.findComponent(EnergySelector).exists()).toBe(true)
    expect(wrapper.findComponent(ToastNotification).exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Untangle')
    expect(wrapper.find('.tagline').text()).toBe('Space to think')
  })
})
