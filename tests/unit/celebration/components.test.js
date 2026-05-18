import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// vi.hoisted runs before imports — no Vue APIs here
const { mockShowCelebration, mockDismiss } = vi.hoisted(() => ({
  mockShowCelebration: vi.fn(),
  mockDismiss: vi.fn(),
}))

// var is fully hoisted (initialized to undefined), avoiding the TDZ that let/const would cause
// when the vi.mock factory runs during module loading (before module body executes)
// eslint-disable-next-line no-var
var mockPopup

vi.mock('../../../src/composables/useCelebration.js', () => {
  mockPopup = ref(null)
  return {
    useCelebration: () => ({
      popup: mockPopup,
      showCelebration: mockShowCelebration,
      dismiss: mockDismiss,
    }),
  }
})

import CelebrationPopup from '../../../src/components/CelebrationPopup.vue'

describe('celebration popup — components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPopup.value = null
  })

  describe('CelebrationPopup — visibility', () => {
    it('renders nothing when popup is null', () => {
      const wrapper = mount(CelebrationPopup)
      expect(wrapper.find('[data-testid="celebration-overlay"]').exists()).toBe(false)
    })

    it('renders the overlay when there is a message', () => {
      mockPopup.value = 'You crushed it!'
      const wrapper = mount(CelebrationPopup)
      expect(wrapper.find('[data-testid="celebration-overlay"]').exists()).toBe(true)
    })

    it('displays the celebration message text', () => {
      mockPopup.value = 'Amazing work!'
      const wrapper = mount(CelebrationPopup)
      expect(wrapper.find('[data-testid="celebration-text"]').text()).toBe('Amazing work!')
    })

    it('renders the popup card inside the overlay', () => {
      mockPopup.value = 'Well done!'
      const wrapper = mount(CelebrationPopup)
      expect(wrapper.find('[data-testid="celebration-popup"]').exists()).toBe(true)
    })
  })

  describe('CelebrationPopup — dismiss', () => {
    it('calls dismiss when the overlay is clicked', async () => {
      mockPopup.value = 'You did it!'
      const wrapper = mount(CelebrationPopup)
      await wrapper.find('[data-testid="celebration-overlay"]').trigger('click')
      expect(mockDismiss).toHaveBeenCalledOnce()
    })
  })
})
