import { ref } from 'vue'

export const LOW_MESSAGES = [
  "It's okay to take this slow today.",
  'Small steps count just as much as big ones.',
  'Rest is productive too.',
  "You don't have to do it all right now.",
  'One tiny task is plenty for today.',
  'Being gentle with yourself is not a setback.',
  'Low energy days deserve low-pressure plans.',
  "You're allowed to just show up today.",
  "Doing less today doesn't undo what you've built.",
  "It's fine to pick just one thing and let the rest wait.",
  "Taking care of yourself is today's priority.",
  'A slow day is still a day moved forward.',
  "You don't need to earn rest.",
  'Whatever you manage today is enough.',
  'Quiet days have their own kind of progress.',
  "There's no rush — go at the pace that feels okay.",
  'Showing up gently still counts as showing up.',
  "It's alright to let today be simple.",
  'You can pick this back up whenever you have more to give.',
  "Softness today isn't a step backward.",
]

export const MEDIUM_MESSAGES = [
  "You've got a good, steady amount to work with today.",
  'This is a solid pace to get real things done.',
  "You're right in the sweet spot for making progress.",
  'Steady energy, steady progress.',
  'This is plenty to tackle what is in front of you.',
  'A balanced day is a good day to build momentum.',
  'You can take on a few things without overdoing it.',
  'This feels like a good day to make some headway.',
  "Nice and steady — that's a great place to work from.",
  'You have enough here to move things forward.',
  'This is a comfortable pace for getting things done.',
  'A middle-of-the-road day is still a productive one.',
  "You're set up well to make solid progress today.",
  'This is a good amount of energy to work with.',
  'Consistent effort today will add up nicely.',
  'You can pace yourself and still get plenty done.',
  'This is a dependable kind of day.',
  'Enough energy to make real progress, without overdoing it.',
  'A grounded, steady day like this suits focused work.',
  "You're well-positioned to make things happen today.",
]

export const HIGH_MESSAGES = [
  "You're firing on all cylinders today!",
  'Ride this momentum as far as it takes you!',
  'This is your day to make big things happen!',
  'Channel that energy into something great!',
  "You've got the drive to tackle the big stuff today!",
  "Let's turn this energy into real progress!",
  'Today feels like a breakthrough kind of day!',
  "Go get after it — you're ready!",
  'This is the energy that gets big things done!',
  'Make the most of this momentum!',
  "You're unstoppable today!",
  'Time to knock out everything on your list!',
  'This is prime time to tackle your biggest goals!',
  "Your energy is high — let's put it to great use!",
  'Full speed ahead!',
  'This is exactly the kind of day for bold moves!',
  "You're ready to take on anything today!",
  "Let's turn that spark into serious progress!",
  "Today's got real momentum — use it well!",
  "You're in a great place to push forward!",
]

const MESSAGE_POOLS = {
  low: LOW_MESSAGES,
  medium: MEDIUM_MESSAGES,
  high: HIGH_MESSAGES,
}

const selectedLevel = ref(null)
const toastMessage = ref(null)
const toastId = ref(0)

function randomMessage(level) {
  const pool = MESSAGE_POOLS[level]
  return pool[Math.floor(Math.random() * pool.length)]
}

function selectLevel(level) {
  if (selectedLevel.value === level) {
    selectedLevel.value = null
    return
  }

  selectedLevel.value = level
  toastMessage.value = randomMessage(level)
  toastId.value += 1
}

function dismissToast() {
  toastMessage.value = null
}

export function useEnergyLevel() {
  return {
    selectedLevel,
    toastMessage,
    toastId,
    selectLevel,
    dismissToast,
  }
}
