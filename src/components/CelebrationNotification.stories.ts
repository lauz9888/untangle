import { vi, expect } from 'vitest'
import { page } from 'vitest/browser'
import { within, userEvent, waitFor } from 'storybook/test'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import CelebrationNotification from './CelebrationNotification.vue'

const state = {
  celebrationMessage: ref<string | null>(null),
  celebrationId: ref(0),
  confettiPieces: ref<unknown[]>([]),
  confettiBurstId: ref(0),
  completionFocusTarget: ref(null),
  celebrate: vi.fn(),
  dismissCelebration: vi.fn(),
  pauseDismiss: vi.fn(),
  resumeDismiss: vi.fn(),
  consumeCompletionFocusTarget: vi.fn(),
  toggleTaskDoneWithCelebration: vi.fn(),
}

vi.mock('../composables/useCelebration', () => ({
  useCelebration: () => state,
}))

function seed(message: string | null) {
  state.celebrationMessage.value = message
  state.celebrationId.value = message ? 1 : 0
  state.celebrate.mockReset()
  state.dismissCelebration.mockReset()
  state.pauseDismiss.mockReset()
  state.resumeDismiss.mockReset()
}

const meta: Meta<typeof CelebrationNotification> = {
  title: 'Components/CelebrationNotification',
  component: CelebrationNotification,
}
export default meta
type Story = StoryObj<typeof CelebrationNotification>

export const Empty: Story = {
  beforeEach: () => seed(null),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector('[role="status"]')!
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(canvasElement.querySelector('[data-testid="celebration"]')).toBeNull()
  },
}

// Reproduces tests/unit/celebration/components.test.ts's "clicking close calls dismissCelebration".
export const WithMessage: Story = {
  beforeEach: () => seed('Nicely done. That one is off your plate.'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss celebration' }))
    expect(state.dismissCelebration).toHaveBeenCalled()
  },
}

export const LongMessage: Story = {
  beforeEach: () =>
    seed(
      'You finished something you were carrying around, and that matters more than it feels like right now, so take a breath.'
    ),
}

export const CloseButtonFocused: Story = {
  beforeEach: () => seed('Nicely done. That one is off your plate.'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const close = canvas.getByRole('button', { name: 'Dismiss celebration' })
    close.focus()
    await waitFor(() => expect(document.activeElement).toBe(close))
    expect(state.pauseDismiss).toHaveBeenCalled()
  },
}

export const Mobile: Story = {
  beforeEach: () => seed('Nicely done. That one is off your plate.'),
  play: async ({ canvasElement }) => {
    await page.viewport(390, 844)
    const close = canvasElement.querySelector('.celebration-close') as HTMLElement
    const rect = close.getBoundingClientRect()
    expect(rect.width).toBeGreaterThanOrEqual(44)
    expect(rect.height).toBeGreaterThanOrEqual(44)
  },
}
