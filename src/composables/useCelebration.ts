import { ref, type Ref } from 'vue'
import { useTasks } from './useTasks'
import { getCompletionFocusTarget, type FocusTarget } from './useBoardOrdering'

export const CELEBRATION_AUTO_DISMISS_MS = 6000
export const CONFETTI_TOTAL_MS = 4500
export const CONFETTI_PIECE_COUNT = 60

export const CELEBRATION_MESSAGES: readonly string[] = [
  'Task complete. Well done.',
  'One more thing off your plate.',
  'That is real progress.',
  'Nicely done. You showed up for that.',
  'Done. Take a breath, you earned it.',
  'You finished something. That counts.',
  'Small steps add up, and that was one.',
  'Look at you, getting things done.',
  'That one is behind you now.',
  'Great work. Be proud of that.',
  'You did it, one step at a time.',
  'Another one down. Steady progress.',
  'Well done for following through.',
  'That took effort, and you did it.',
  'Finished. Enjoy the moment.',
  'You made space to think by finishing that.',
  'Good job. Your future self says thanks.',
  'Progress feels good, does it not?',
  'Complete. You are building momentum.',
  'That is one less thing to carry.',
  'Nice one. Keep it gentle, keep it going.',
  'You turned an intention into action.',
  'Done and dusted. Well played.',
  'A job well done.',
  'You chose it, you did it. Lovely.',
  'That deserves a little celebration.',
  'Wonderful. Another task untangled.',
  'You handled that. Nicely.',
  'Finished at your own pace, and that is fine.',
  'Good going. Rest a moment if you like.',
  'You kept your word to yourself.',
  'That is a win, big or small.',
  'Tidy work. Onwards when you are ready.',
  'You are making this look easy.',
  'One thread untangled.',
  'Success. That feels better already.',
  'You stuck with it and it paid off.',
  'Brilliant. One more done.',
  'Your effort showed up there.',
  'Completed with care.',
  'Lovely work. Be kind to yourself today.',
  'That is how it gets done: one task at a time.',
  'You can cross that off with confidence.',
  'Great follow-through.',
  'Marked as done. You should feel good.',
  'The list is lighter, and so are you.',
  'Another step forward. Well done.',
  'You did what you set out to do.',
  'Excellent. Take the win.',
  'Done. You are doing better than you think.',
]

export const CONFETTI_COLORS: readonly string[] = [
  '#e63946',
  '#f4a261',
  '#e9c46a',
  '#2a9d8f',
  '#457b9d',
  '#8e6bbf',
  '#f28482',
]

export interface ConfettiPiece {
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

export function pickCelebrationMessage(): string {
  const len = CELEBRATION_MESSAGES.length
  const index = Math.min(len - 1, Math.floor(Math.random() * len))
  return CELEBRATION_MESSAGES[index]!
}

export function generateConfettiPieces(
  count: number,
  rand: () => number = Math.random
): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = []
  for (let i = 0; i < count; i++) {
    const colorIndex = Math.min(
      CONFETTI_COLORS.length - 1,
      Math.floor(rand() * CONFETTI_COLORS.length)
    )
    const delay = rand() * 0.8
    // Every piece must finish falling before the cleanup timer (minus a 0.5s margin).
    const duration = Math.min(2.2 + rand() * 1.3, (CONFETTI_TOTAL_MS - 500) / 1000 - delay)
    pieces.push({
      id: i,
      left: rand() * 100,
      delay,
      duration,
      size: 6 + rand() * 6,
      color: CONFETTI_COLORS[colorIndex]!,
      rotation: rand() * 360,
      drift: -80 + rand() * 160,
      shape: rand() < 0.5 ? 'rect' : 'circle',
    })
  }
  return pieces
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const celebrationMessage: Ref<string | null> = ref(null)
const celebrationId = ref(0)
const confettiPieces: Ref<ConfettiPiece[]> = ref([])
const confettiBurstId = ref(0)
const completionFocusTarget: Ref<FocusTarget | null> = ref(null)

let messageTimer: ReturnType<typeof setTimeout> | null = null
let confettiTimer: ReturnType<typeof setTimeout> | null = null

function clearMessageTimer(): void {
  if (messageTimer !== null) {
    clearTimeout(messageTimer)
    messageTimer = null
  }
}

function startMessageTimer(): void {
  clearMessageTimer()
  messageTimer = setTimeout(dismissCelebration, CELEBRATION_AUTO_DISMISS_MS)
}

function clearConfettiTimer(): void {
  if (confettiTimer !== null) {
    clearTimeout(confettiTimer)
    confettiTimer = null
  }
}

function clearConfetti(): void {
  confettiPieces.value = []
}

function dismissCelebration(): void {
  clearMessageTimer()
  celebrationMessage.value = null
}

function pauseDismiss(): void {
  clearMessageTimer()
}

function resumeDismiss(): void {
  if (celebrationMessage.value === null) {
    return
  }
  startMessageTimer()
}

function celebrate(): void {
  celebrationMessage.value = pickCelebrationMessage()
  celebrationId.value += 1
  startMessageTimer()

  clearConfettiTimer()
  if (prefersReducedMotion()) {
    clearConfetti()
    return
  }
  confettiPieces.value = generateConfettiPieces(CONFETTI_PIECE_COUNT)
  confettiBurstId.value += 1
  confettiTimer = setTimeout(() => {
    confettiTimer = null
    clearConfetti()
  }, CONFETTI_TOTAL_MS)
}

function consumeCompletionFocusTarget(): FocusTarget | null {
  const target = completionFocusTarget.value
  completionFocusTarget.value = null
  return target
}

function toggleTaskDoneWithCelebration(
  taskId: number,
  options?: { computeFocusTarget?: boolean }
): boolean {
  const store = useTasks()
  const task = store.tasks.value.find((t) => t.id === taskId)
  completionFocusTarget.value = null
  if (!task) {
    return false
  }
  const wasDone = task.done
  if (!wasDone && options?.computeFocusTarget !== false) {
    completionFocusTarget.value = getCompletionFocusTarget(store.tasks.value, taskId)
  }
  store.toggleTaskDone(taskId)
  if (!wasDone) {
    celebrate()
  }
  return !wasDone
}

const api = {
  celebrationMessage,
  celebrationId,
  confettiPieces,
  confettiBurstId,
  completionFocusTarget,
  celebrate,
  dismissCelebration,
  pauseDismiss,
  resumeDismiss,
  consumeCompletionFocusTarget,
  toggleTaskDoneWithCelebration,
}

export function useCelebration() {
  return api
}
