import { ref } from 'vue'

export const TOUGH_LOVE_MESSAGES = [
  "That task isn't going to do itself. Time to move.",
  "You've been thinking about this long enough. Start now.",
  'Done beats perfect. Get it moving.',
  'Future you will be very grateful if present you just starts.',
  "The hardest part is starting. You've stalled long enough.",
  "Stop waiting to feel ready. You won't. Do it anyway.",
  'This is the moment. Not later. Now.',
  'You already know what needs to be done. Go do it.',
  "You've got more capacity than you're giving yourself credit for.",
  'How long has this been on your list? Exactly. Start.',
  'The version of you who finished this task is waiting. Go meet them.',
  'Your excuses are valid. And irrelevant. Do it anyway.',
  'Progress is progress. Even slow is faster than still.',
  'You are not as blocked as you think you are.',
  'Pick it up. Just the first step. Go.',
  'Waiting for motivation? It shows up after you start, not before.',
  'The task is smaller than the dread. Trust that. Begin.',
  "You've postponed this enough. Today's the day.",
  'One small move beats zero big ones. Move.',
  "You've handled harder things than this. Get on with it.",
  'Stop overthinking. Start doing.',
  "Not feeling it? Do it anyway. That's discipline.",
  "The window of 'I'll do it later' is closing. Act now.",
  'Every minute you delay costs future you. Start.',
  'Two minutes of discomfort now beats hours of guilt later.',
  "Get uncomfortable for ten minutes. That's all. Start.",
  "You're not a passenger in your own life. Drive.",
  'No one is coming to do this for you. Step up.',
  'The version of you who finished this feels amazing. Be them.',
  'Stop talking yourself out of it. Just begin.',
  'Put down the distraction. Pick up the task.',
  'You already decided this mattered. Act like it.',
  'Resistance is highest before you start. Push through.',
  "What would you do if you weren't afraid? Do that.",
  'Time is not infinite. Use some of it on this.',
  "You're closer to done than you think. Keep going.",
  'Your future self deserves better than another delay.',
  "The task didn't get easier from waiting. Start now.",
  "You've survived every hard thing so far. This is manageable.",
  'No more warm-up laps. This is the race. Run.',
  'The best time to start was earlier. Second best is now.',
  "You're capable. You're just choosing not to. Choose differently.",
  'Energy follows action. Move first, feel motivated second.',
  "You don't have to like it. You just have to do it.",
  'Inaction is also a choice. Make a better one.',
  'Five minutes. Just give it five honest minutes.',
  'The longer you wait, the bigger it feels. Shrink it by starting.',
  "What's the actual first step? Do that. Just that.",
  'Your goal is waiting. What are you waiting for?',
  "Hard tasks don't disappear. They just pile up. Deal with this one.",
  "You're not going to regret doing it. You will regret not doing it.",
  'Focus is a muscle. Work it.',
  "Every day you delay is a day you're not moving forward.",
  'Make the uncomfortable call. Send the difficult email. Do the thing.',
  'The discomfort is temporary. The satisfaction lasts. Start.',
  "You've been here before and you got through it. Same deal.",
  'Stop letting perfect be the enemy of done.',
  "Just because it's hard doesn't mean you can't do it.",
  "Action over analysis. Every time. Let's go.",
  "Your potential doesn't show up just by thinking about it.",
  'You have a window right now. Use it before it closes.',
  'Start messy. You can clean it up later.',
  'Momentum is earned, not given. Earn some.',
  'Clarity comes from doing, not from thinking about doing.',
  "You'll feel better when it's done. So get it done.",
  'The discomfort of starting is real. The regret of not starting is worse.',
  "Push a little harder today. You'll thank yourself tonight.",
  'Not in the mood? Great. Do it anyway and change your mood.',
  "You've delayed the decision long enough. Make the call.",
  'Effort now equals relief later. Simple math.',
  'No one achieves anything significant without doing something uncomfortable.',
  'You know what to do. The only question is when. Answer: now.',
  'Stop rehearsing and start performing.',
  'Be the person who finishes things. Start here.',
  "Your energy isn't wasted on hard tasks. It's wasted on avoiding them.",
  "This isn't about motivation. It's about commitment. Commit.",
  'Small action, big impact. Even tiny movement counts. Go.',
  "You've been giving yourself permission to wait. Revoke it.",
  'The task requires less from you than your avoidance does.',
  'Decide to be the kind of person who just handles things. Handle this.',
  'Time passes either way. Use this next hour well.',
  "You're procrastinating on purpose. Stop it.",
  'What are you actually protecting yourself from? Just start.',
  'One hour of real effort beats a day of half-effort. Give it that hour.',
  'Progress feels better than comfort. Prove it to yourself.',
  "You've got this. Now prove it.",
  "The task is waiting. So is a better version of you. Let's go.",
  "Good intentions don't move tasks. Action does.",
  "That uneasy feeling? It's procrastination. Do the task and it goes away.",
  "Checking your phone won't make the task smaller. Starting will.",
  "You've been 'about to start' for a while now. Actually start.",
  'The drag of avoidance is heavier than the weight of doing. Trust that.',
  "Being busy with other things isn't the same as being done with this.",
  "This task is on your list for a reason. That reason hasn't changed.",
  'You already know this needs to happen. So make it happen.',
  "Stop treating it like a suggestion. This is something you're doing.",
  'The version of today that got this done feels lighter. Go be them.',
  "You've stalled. That's fine. Now unstall.",
  'Discomfort is the price of progress. You can afford it.',
  "Look at the task. Now do the task. That's it.",
]

const toughLove = ref(null)
let timer = null

export function useToughLove() {
  function showToughLove() {
    const message = TOUGH_LOVE_MESSAGES[Math.floor(Math.random() * TOUGH_LOVE_MESSAGES.length)]
    clearTimeout(timer)
    toughLove.value = message
    timer = setTimeout(() => {
      toughLove.value = null
    }, 5000)
  }

  function dismissToughLove() {
    clearTimeout(timer)
    toughLove.value = null
  }

  return { toughLove, showToughLove, dismissToughLove }
}
