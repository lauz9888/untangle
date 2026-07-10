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

export const ENCOURAGEMENT_MESSAGES = [
  'Every bit of progress counts.',
  "You're doing better than you think.",
  'One task at a time is still moving forward.',
  "It's okay to go at your own pace.",
  'You showed up today, and that matters.',
  'Small wins add up to big change.',
  "You've got this.",
  'Progress, not perfection.',
  'Be proud of how far you have come.',
  "You're allowed to take this one step at a time.",
  'Whatever you get done today is enough.',
  "Keep going — you're closer than you think.",
  'Trust the process, one step at a time.',
  'Your effort today matters, even the quiet parts.',
  "You're capable of more than you realize.",
  'Take a breath — you are handling this well.',
  "There's no wrong way to make progress.",
  'You are exactly where you need to be right now.',
  'Give yourself credit for showing up.',
  'Momentum builds from small steps.',
  'You are allowed to be a work in progress.',
  "Today's effort is tomorrow's progress.",
  'Believe in the process you are building.',
  "You're doing just fine.",
  'One task down is still a win.',
  "It's okay if today looks different than planned.",
  'You bring more to this than you know.',
  'Keep chipping away — it adds up.',
  'You are not behind, you are on your own path.',
  "Celebrate the small stuff — it's not small.",
  'This moment of effort counts.',
  "You're building something, even on quiet days.",
  'Your best today is good enough.',
  'Steady effort beats perfect effort.',
  "You've handled hard days before, and you can handle this one.",
  'Every step forward is still forward.',
  'You are doing the work, and that is enough.',
  "Give yourself the same kindness you'd give a friend.",
  'This is a good moment to keep going.',
  "You're allowed to feel good about small progress.",
  'Trust yourself — you know more than you think.',
  'You are not alone in finding this hard sometimes.',
  'Keep your pace — it is the right one for you.',
  "You're making it happen, one piece at a time.",
  'This effort is not wasted, even if it feels slow.',
  'You are worth the same patience you give others.',
  "Today counts, even if it's a small day.",
  'You are further along than you were yesterday.',
  'Nice work getting this far.',
  "You've got what it takes to keep moving.",
]

export const TOUGH_LOVE_MESSAGES = [
  'Stop waiting to feel ready. Start anyway.',
  'You already know what to do. Go do it.',
  'Excuses are just decisions in disguise. Choose again.',
  "The task isn't getting smaller by staring at it.",
  'Perfect conditions are a myth. Move now.',
  "You've stalled long enough. Pick it up.",
  "Motivation isn't coming to save you. Discipline is.",
  'Comfort got you here. It will not get you further.',
  'Nobody is coming to do this for you.',
  'Stop negotiating with yourself and just begin.',
  'One more delay is one more excuse you will regret.',
  'You are capable of more than this hesitation suggests.',
  'Feelings are not instructions. Act despite them.',
  'The version of you tomorrow needs you to move today.',
  'Quit rehearsing the task and actually start it.',
  'You do not need permission to get started.',
  'Every minute spent stalling is a minute wasted.',
  'Being tired is not the same as being unable.',
  "This won't finish itself. Get moving.",
  'You owe yourself better than another day of avoidance.',
  'Stop scrolling. Start doing.',
  'The hard part is starting, and you are still not starting.',
  "You've had enough time to think. Now act.",
  'Nobody is impressed by intentions. Show results.',
  'Discomfort is not a stop sign. Push through it.',
  'You are not stuck, you are stalling.',
  'Stop waiting for a sign. This is it.',
  'Cut the excuses and get to work.',
  "You've survived every hard day before this one. Get on with it.",
  'Small effort now beats big regret later.',
  'Enough deliberating. Decide and move.',
  'You are the only thing standing between you and this task.',
  'Quit circling the task and land on it.',
  'This is not the time to be gentle with your excuses.',
  "You don't feel like it. Do it anyway.",
  'Waiting for motivation is a losing strategy. Start without it.',
  'You know the cost of not doing this. Act accordingly.',
  'Stop planning to start and actually start.',
  'The task is not going to get easier by delaying it.',
  'You have what it takes. Use it now.',
  'Nobody remembers your reasons, only your results.',
  'You are better than this pattern of putting it off.',
  'Get uncomfortable. That is where progress lives.',
  'You keep saying later. Make it now.',
  'This hesitation is costing you more than the task would.',
  'Stand up and do the thing you are avoiding.',
  'Your future self is watching what you choose right now.',
  'Enough with the warm-up. Get to the real work.',
  'You do not need more time, you need to start.',
  'Move first, feel better second. That is the order.',
]

const MESSAGE_POOLS = {
  low: LOW_MESSAGES,
  medium: MEDIUM_MESSAGES,
  high: HIGH_MESSAGES,
}

const selectedLevel = ref(null)
const toastMessage = ref(null)
const toastId = ref(0)

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)]
}

function selectLevel(level) {
  if (selectedLevel.value === level) {
    selectedLevel.value = null
    return
  }

  selectedLevel.value = level
  toastMessage.value = randomFrom(MESSAGE_POOLS[level])
  toastId.value += 1
}

function encourageMe() {
  toastMessage.value = randomFrom(ENCOURAGEMENT_MESSAGES)
  toastId.value += 1
}

function toughLove() {
  toastMessage.value = randomFrom(TOUGH_LOVE_MESSAGES)
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
    encourageMe,
    toughLove,
    dismissToast,
  }
}
