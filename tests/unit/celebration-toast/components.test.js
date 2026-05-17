import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// vi.hoisted runs before imports — no Vue APIs here
const { mockShowCelebration, mockDismissToast } = vi.hoisted(() => ({
  mockShowCelebration: vi.fn(),
  mockDismissToast: vi.fn(),
}))

// var is fully hoisted (initialized to undefined), avoiding the TDZ that let/const would cause
// when the vi.mock factory runs during module loading (before module body executes)
// eslint-disable-next-line no-var
var mockToast

vi.mock('../../../src/composables/useToast.js', () => {
  mockToast = ref(null)
  return {
    useToast: () => ({
      toast: mockToast,
      showCelebration: mockShowCelebration,
      dismissToast: mockDismissToast,
    }),
  }
})

import ToastNotification from '../../../src/components/ToastNotification.vue'

describe('celebration popup — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.value = null
  })

  describe('ToastNotification — visibility', () => {
    it('renders nothing when toast is null', () => {
      const wrapper = mount(ToastNotification)
      expect(wrapper.find('.celebration-overlay').exists()).toBe(false)
    })

    it('renders the popup when toast has a message', () => {
      mockToast.value = 'You crushed it!'
      const wrapper = mount(ToastNotification)
      expect(wrapper.find('.celebration-overlay').exists()).toBe(true)
    })

    it('displays the celebration message text', () => {
      mockToast.value = 'Amazing work!'
      const wrapper = mount(ToastNotification)
      expect(wrapper.find('.celebration-text').text()).toBe('Amazing work!')
    })

    it('renders the popup card inside the overlay', () => {
      mockToast.value = 'Well done!'
      const wrapper = mount(ToastNotification)
      expect(wrapper.find('.celebration-overlay .celebration-popup').exists()).toBe(true)
    })
  })

  describe('ToastNotification — dismiss', () => {
    it('calls dismissToast when the overlay is clicked', async () => {
      mockToast.value = 'You did it!'
      const wrapper = mount(ToastNotification)
      await wrapper.find('.celebration-overlay').trigger('click')
      expect(mockDismissToast).toHaveBeenCalledOnce()
    })
  })
})
