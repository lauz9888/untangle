import { ref } from 'vue'

export const ENCOURAGEMENT_MESSAGES = [
  "You're here, and that counts for something. 💙",
  "Starting is the hardest part. You've already done that.",
  "There's no right way to do this. Your way is fine.",
  'Even tiny progress moves things forward.',
  "You don't have to do everything. Just one small thing.",
  'Rest is also part of getting things done.',
  "You're doing better than you think you are.",
  "It's okay if this takes longer than you expected.",
  'Being here is enough. The rest will follow when it can.',
  'Your brain works differently, not worse.',
  'This task is smaller than it feels right now.',
  "You've got through hard things before. This is one more.",
  "You don't have to feel motivated to make a start.",
  'Slow and wobbly still counts as moving forward.',
  "You're allowed to take breaks. Lots of them.",
  'One thing at a time. Just this one.',
  "It doesn't have to be perfect. It just has to happen.",
  'The fact that you opened this means something.',
  "Your energy is limited. It's okay to spend it wisely.",
  "You're not lazy. You're working within real limits.",
  'Starting for two minutes counts.',
  'Give yourself credit for the invisible effort.',
  "Things don't have to feel hard to be worth doing.",
  'Even resting can be productive.',
  "Today's version of you is doing the best they can.",
  "Demand avoidance is real. You're navigating it.",
  'Being aware of what you need is a strength, not a flaw.',
  "One less thing on the list. That's the whole goal.",
  'You made it to today. That matters.',
  "The pressure you feel isn't the truth about what's possible.",
  "Progress looks different every day. That's okay.",
  "You're not behind. You're exactly where you are.",
  'What would feel like the smallest possible step right now?',
  "You don't owe anyone a perfect performance.",
  'Your nervous system is doing a lot right now. Be gentle with it.',
  'Doing something small is still doing something.',
  'Things in progress count as things happening.',
  "You're allowed to find this hard.",
  "It's okay to switch tasks when one feels stuck.",
  'Momentum can come after starting, not before.',
  "You don't have to be at 100% to make some progress.",
  "Existing today took effort. That's worth noticing.",
  "This is hard because it's genuinely hard, not because of you.",
  "The mental load you're carrying is real and heavy.",
  'Small is still real. A little is still something.',
  "You're not failing. You're managing.",
  'Let this be low stakes. It can be.',
  "You've done things like this before, even when it felt impossible.",
  "It's okay to do this imperfectly and move on.",
  'Your pace is your pace. There is no correct speed.',
  "Notice what you've already done today, not just what's left.",
  'You deserve encouragement just for trying.',
  'Working with your brain, not against it, is the smart move.',
  "If it feels too big, make it smaller. There's no rule against that.",
  'You are not a machine. You are a person. Act accordingly.',
  'A messy start is still a start.',
  'You have more capacity than your anxiety says you do.',
  'This task exists to serve you, not the other way around.',
  "Being gentle with yourself isn't giving up. It's strategy.",
  'You can come back to the hard bits later.',
  "It's okay to ask for what you need to get started.",
  "Every task you finish was once a task you hadn't started.",
  "You're doing something today. That's not nothing.",
  "Sometimes 'good enough' is the wisest choice.",
  "You don't need to earn a rest. Rest is already yours.",
  'Noticing resistance is not the same as failing.',
  "Your efforts have value even when they're hard to see.",
  'You are more than your to-do list.',
  'The task can wait for you to be ready enough.',
  'Even if this took longer than expected, you still did it.',
  'You are not a burden for needing things structured differently.',
  'Let this be just one thing. Not everything.',
  "It's okay to take the easy route. Easier is still done.",
  'The goal is not perfection. The goal is movement.',
  'Right now, at this moment, you are okay.',
  'You get to decide what counts as success today.',
  "Your worth doesn't go up or down based on task completion.",
  "If you've been sitting with this, that's not wasted time.",
  'Working around your brain takes skill. You have it.',
  "A plan you'll actually do beats a perfect plan you won't.",
  "You're not expected to be at full capacity all the time.",
  "The energy it takes to get started is real. You're spending it.",
  "You can pause without stopping. They're different things.",
  "Your best looks different on different days. Today's version counts.",
  "It's okay to outsmart the resistance instead of fighting it.",
  "You're building something, even on days that don't feel like it.",
  "Showing up is a choice. You made it. That's real.",
  'Not everything needs to be done today. Some things can wait.',
  "You're not alone in finding this kind of thing hard.",
  'Gentle persistence is still persistence.',
  'Done is better than perfect. Done is actually better.',
  "The moment you're in right now is manageable.",
  'Trust yourself to know what you can handle today.',
  "You've navigated hard things quietly. This is another one you'll get through.",
  'Being aware of your limits is wisdom, not weakness.',
  'Start anywhere. Starting anywhere is better than not starting.',
  'Even a small win today is worth noticing.',
  "You are doing this in the way that works for you. That's valid.",
  "There's no shame in needing a different approach.",
  'Whatever you manage today is enough.',
]

const encouragement = ref(null)
let timer = null

export function useEncouragement() {
  function showEncouragement() {
    const message =
      ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]
    clearTimeout(timer)
    encouragement.value = message
    timer = setTimeout(() => {
      encouragement.value = null
    }, 5000)
  }

  function dismissEncouragement() {
    clearTimeout(timer)
    encouragement.value = null
  }

  return { encouragement, showEncouragement, dismissEncouragement }
}
