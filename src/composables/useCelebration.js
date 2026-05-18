import { ref } from 'vue'

export const STREAK_MILESTONES = [1, 3, 7, 30, 90, 180, 365]

export const MILESTONE_MESSAGES = {
  1: "Day one — you showed up! That's where every great streak begins. Let's go! 🌱",
  3: "3 days in a row! The habit is forming — don't stop now! 🔥",
  7: "A whole week of getting things done! You've proven you can do this. Keep going! 🗓️✨",
  30: "30 days! One month of showing up every single day. That's not luck — that's character. 🏆",
  90: '90 days. Three months. This is who you are now. Consistency is your superpower! 💎',
  180: 'Half a year! 180 days of making it happen. You are genuinely unstoppable. 🌟',
  365: '365 days. One full year. You did it — an unbroken streak of showing up for yourself. Legendary. 🎆',
}

export const CELEBRATION_MESSAGES = [
  "You crushed it! That's one less thing to worry about! 🎉",
  "Task demolished! You're unstoppable! ⚡",
  'Done and dusted! Look at you go! ✨',
  'Yes! Another one bites the dust! 🏆',
  "Boom! Task complete! You're on fire! 🔥",
  'Absolutely nailed it! Keep that momentum going! 💪',
  "That's what champions do! Task done! 🥇",
  'You did it! One step closer to your goals! 🚀',
  "Checked off and feeling good! You're amazing! 🌟",
  'Mission accomplished! Nothing can stop you now! 💥',
  "Outstanding work! You're making it look easy! 😎",
  'Task complete! You are absolutely crushing this! 🎊',
  'Yes, yes, YES! Another task down! You legend! 🙌',
  'Look at you, getting things done! Incredible! 🌈',
  'That task never stood a chance against you! 💫',
  "Woohoo! You're on a roll! Keep it up! 🎯",
  "Done! You're building serious momentum today! ⚡",
  'Fantastic! Your future self thanks you! 🤩',
  'Task slayed! You are absolutely killing it! 🗡️',
  'Check! You make productivity look effortless! ✅',
  "Brilliant! That's how it's done! 🌠",
  "You're a productivity powerhouse! Task complete! 💡",
  "Knocked it out of the park! You're incredible! ⚾",
  "Another task conquered! You're invincible today! 🦸",
  'So satisfying! That task is history now! 📜',
  'You legend! Task complete and loving it! 🎶',
  'Done! Every task you finish makes you stronger! 💪',
  'Tremendous! You just made the world a little tidier! 🌍',
  "Task obliterated! You're a force of nature! 🌪️",
  'Beautiful work! You should be so proud! 🌸',
  "That's a wrap on that task! You're sensational! 🎬",
  'Exceptional effort! Nothing stands in your way! 🏅',
  "You're unstoppable! Task complete, what's next?! 🚂",
  "Smashed it! Absolute scenes! You're the best! 🥳",
  'Remarkable! You just levelled up! 🎮',
  'Done! You have what it takes to achieve anything! 🌻',
  "Task finished! You're proving yourself right today! 💎",
  'What a superstar move! Task = complete! ⭐',
  "You're on a winning streak! Task done! 🏆",
  "Magnificent! That felt good, didn't it? 😄",
  "Complete! You're turning intentions into reality! 🌅",
  'Task conquered! The stars aligned just for you! 🌙',
  "You're doing it! One task at a time, all the way! 🎠",
  'Extraordinary! You just made today count! 📅',
  "Yes!! You're a productivity superhero! 🦸‍♀️",
  "Task vanquished! You're writing your success story! 📖",
  'High five! That task is well and truly done! 🙏',
  'You absolute hero! Task complete! 🎖️',
  'Glorious! Every done task is a win for you! 🏵️',
  "Task finished! You're exactly where you need to be! 🌟",
]

const popup = ref(null)
let timer = null

export function useCelebration() {
  function showCelebration() {
    const message = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]
    clearTimeout(timer)
    popup.value = message
    timer = setTimeout(() => {
      popup.value = null
    }, 3500)
  }

  function showMilestone(count) {
    const message = MILESTONE_MESSAGES[count]
    if (!message) return
    clearTimeout(timer)
    popup.value = message
    timer = setTimeout(() => {
      popup.value = null
    }, 5000)
  }

  function dismiss() {
    clearTimeout(timer)
    popup.value = null
  }

  return { popup, showCelebration, showMilestone, dismiss }
}
