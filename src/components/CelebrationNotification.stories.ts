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

// Keep the real pure helpers (computeNotificationTop, NOTIFICATION_MIN_TOP) the component imports.
vi.mock('../composables/useCelebration', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// Req 9a: the card is placed just below the real header, never over it.
export const WithHeaderAbove: Story = {
  beforeEach: () => seed('Nicely done. That one is off your plate.'),
  decorators: [
    (story) => ({
      components: { story },
      template: '<header id="app-header" style="height:120px">Header</header><story />',
    }),
  ],
  play: async ({ canvasElement }) => {
    const header = document.getElementById('app-header')!
    const region = canvasElement.querySelector('[role="status"]') as HTMLElement
    const card = canvasElement.querySelector('[data-testid="celebration"]') as HTMLElement
    await waitFor(() => {
      expect(region.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        header.getBoundingClientRect().bottom
      )
    })
    const h = header.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const intersects = !(
      c.right <= h.left ||
      c.left >= h.right ||
      c.bottom <= h.top ||
      c.top >= h.bottom
    )
    expect(intersects).toBe(false)
  },
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
