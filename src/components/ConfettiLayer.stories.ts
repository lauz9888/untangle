import { vi, expect } from 'vitest'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import ConfettiLayer from './ConfettiLayer.vue'

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

const COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#9b5de5', '#f15bb5']

function fixturePieces(n: number): FakePiece[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: (i * 13) % 100,
    delay: (i % 5) * 0.1,
    duration: 2.5 + (i % 4) * 0.2,
    size: 6 + (i % 7),
    color: COLORS[i % COLORS.length]!,
    rotation: (i * 37) % 360,
    drift: ((i % 9) - 4) * 15,
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

vi.mock('../composables/useCelebration', () => ({
  useCelebration: () => state,
}))

const meta: Meta<typeof ConfettiLayer> = {
  title: 'Components/ConfettiLayer',
  component: ConfettiLayer,
}
export default meta
type Story = StoryObj<typeof ConfettiLayer>

export const Idle: Story = {
  beforeEach: () => {
    state.confettiPieces.value = []
    state.confettiBurstId.value = 0
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('[data-testid="confetti-layer"]')).toBeNull()
  },
}

export const Bursting: Story = {
  beforeEach: () => {
    state.confettiPieces.value = fixturePieces(24)
    state.confettiBurstId.value = 1
  },
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector('[data-testid="confetti-layer"]')!
    expect(layer).not.toBeNull()
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.querySelectorAll('.confetti-piece')).toHaveLength(24)
    expect(layer.querySelectorAll('[tabindex], a, button, input, select, textarea')).toHaveLength(0)
    expect(getComputedStyle(layer).pointerEvents).toBe('none')
  },
}
