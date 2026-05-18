# Untangle

A task manager designed for anyone who struggles with overwhelm, motivation, task initiation, or consistency — and built to be neurodivergent-friendly without being exclusively for neurodivergent people.

## What it does

Untangle helps you manage tasks in a way that respects how you actually feel, not just what's theoretically most important.

Tasks are organised across three columns:

- **Now** — what you're focusing on today
- **Next** — what's coming up
- **Future** — everything else, parked without pressure

Each task can have an **energy level** (tiny, small, medium, or large). You set your current energy in the header, and any task that needs more energy than you have right now is faded out — still visible, but clearly deprioritised.

When a task is done, you mark it complete. It disappears from the board, a celebration popup appears, and the task is remembered for your history.

Each task supports a title, energy level, due date, available-from date, and subtasks. All fields can be set on creation and edited afterwards. Tasks can be moved between columns with the **← →** arrow buttons or by drag and drop.

The **streak counter** (in the header, next to the controls) shows how many days in a row you've completed at least one task. It increments on the first completion of each new day and resets if a full active day passes with nothing completed. The flame icon glows when the streak is active.

The **settings cog** (top-right corner) opens a side panel. Clicking the **About** entry opens a popup with a plain-language overview of what the app is and how it works. The **Streak** section lets you configure three independent exclusion rules:

- **Exclude weekends** — Saturday and Sunday don't count against (or towards) your streak; they're skipped entirely when checking for gaps or recording completions.
- **Exclude UK bank holidays** — England and Wales public holidays (2024–2028) are treated the same way.
- **Streak freeze** — pause the streak until a chosen date. Days up to and including that date are skipped, so a gap over a holiday or period away won't break your streak. The first active day after the freeze is the next required completion.

The **Encourage Me** button (next to the energy selector) displays a gentle, encouraging message in a toast notification at the bottom of the screen. Messages are written to be neurodivergent-friendly, with a low-pressure tone designed for people who may struggle with demand avoidance or executive dysfunction. There are 100 messages picked at random. The toast dismisses itself after five seconds, or can be clicked to dismiss it early.

The **Tough Love** button (between Encourage Me and History) shows a firmer, more direct message in the same toast style. The messages are written to push back against procrastination without being harsh or demanding — an extra nudge rather than a critique. Clicking either button dismisses the other, so only one toast is ever shown at a time.

### Task details

Each task supports:

- **Title** (required)
- **Energy level** — optional, used for the capacity filter
- **Due date** — shown as a date chip on the card; overdue tasks are highlighted
- **Available from date** — for tasks you can't start yet
- **Subtasks** — a checklist with a progress bar (e.g. 2/5 complete)

All of these can be set when creating a task and edited afterwards.

### Moving tasks

Tasks can be moved between columns using the **← →** arrow buttons on each card, or by **dragging and dropping** them into any column.

## Why it exists

Most task managers treat all tasks as equally actionable at all times. Untangle doesn't. It acknowledges that capacity fluctuates, and that being able to see only what's realistic right now is often the difference between starting something and doing nothing.

## Roadmap

- Animal-themed modes with distinct visual styles and wording, for different working vibes

## Usage

```
npm run dev
```

Open `http://localhost:5173` in your browser. No account or internet connection required. All data is stored in your browser's localStorage.

---

## How it's built

### Technology

The app is built with **Vue 3** and **Vite**, using no UI libraries, no router, and no external state management — the scope doesn't require them. Styling is done entirely in CSS using custom properties, with light and dark mode handled automatically based on system preference.

### State and data

All task logic lives in a single composable (`useTasks.js`). This acts as a shared store — every component that calls it gets the same reactive state. It handles creating, editing, moving, completing, and deleting tasks, as well as tracking the current energy level.

Notification state is split across three composables, all singletons. `useCelebration.js` handles task-completion messages: `showCelebration()` picks one of 50 messages at random and displays it as a full-screen centred popup for 3.5 seconds. `useEncouragement.js` and `useToughLove.js` handle the header buttons: each picks one of 100 messages at random and displays it as a bottom-centre toast for 5 seconds. All three dismiss early on click and cancel any running timer before starting a new one. The two toast composables are coordinated in `App.vue` so that triggering one dismisses the other.

Streak state lives in `useStreak.js`, another module-level singleton. It exposes `streakCount` (a computed ref) and `streakSettings` (a reactive ref persisted to localStorage). `recordCompletion()` is called inside `useTasks.js` whenever a task is completed; it increments the count if no active day was missed since the last completion, or resets to 1 if a gap is detected. Excluded days (weekends, bank holidays, freeze period) are transparent to both the gap check and the increment check — they're simply not counted in either direction. A reactive `today` ref, updated by a self-rescheduling `setTimeout` at local midnight, ensures the streak count recomputes automatically when the date rolls over.

Everything is saved to `localStorage` automatically whenever state changes, so nothing is lost on a page refresh. Completed tasks stay in storage (they're just hidden from the board columns) so the history panel can use them.

### Energy filtering

→ [Architecture](https://github.com/lauz9888/untangle/wiki/Architecture) and [Data Model](https://github.com/lauz9888/untangle/wiki/Data-Model) in the wiki cover the design in detail.

---

## Testing

```bash
npm test           # unit tests (Vitest, watch mode)
npm run test:e2e   # end-to-end tests (Playwright)
```

### Unit tests

Unit tests use **Vitest** and **Vue Test Utils** and live in `tests/unit/`, organised into subdirectories by feature:

| Folder | What it covers |
|---|---|
| `task-management/` | Creating, deleting, updating, and completing tasks |
| `task-movement/` | Moving tasks between columns (arrow buttons and direct column moves) |
| `task-editing/` | The inline edit form — pre-filling, saving, cancelling |
| `subtasks/` | Adding, removing, and toggling subtasks |
| `energy/` | The energy selector component and over-capacity logic |
| `persistence/` | localStorage round-tripping and migration of older data |
| `celebration/` | The useCelebration composable (messages, auto-dismiss, dismiss) and CelebrationPopup component |
| `encouragement/` | The useEncouragement composable (messages, auto-dismiss, dismiss) and EncouragementToast component |
| `tough-love/` | The useToughLove composable (messages, auto-dismiss, dismiss) and ToughLoveToast component |
| `settings/` | The SettingsPanel component — structure, About modal, and close behaviour |
| `streak/` | The useStreak composable (count logic, all three exclusion types, persistence, midnight rollover) and the streak display in App.vue and settings in SettingsPanel |

Each feature folder has two files: one that tests the composable logic directly, and one that tests the components that render it. This split exists because the two test styles are technically incompatible — composable tests reset the module between each test to get fresh state, while component tests mock the composable entirely to isolate the component's rendering and event handling.

There are 231 unit tests in total.

### End-to-end tests

End-to-end tests use **Playwright** and run against a real dev server. They live in `tests/e2e/`, one file per feature area:

| File | What it covers |
|---|---|
| `layout.spec.js` | Page structure, column headers, energy buttons, defaults |
| `task-management.spec.js` | Adding, deleting, completing tasks, and the celebration popup |
| `task-editing.spec.js` | Editing task title, energy, dates, and subtasks |
| `task-movement.spec.js` | Arrow buttons and drag-and-drop between columns |
| `energy.spec.js` | Over-capacity filtering applied and removed reactively |
| `persistence.spec.js` | Tasks, moves, edits, and energy level surviving a page reload |
| `history.spec.js` | History panel opens, shows chart, shows best-week message |
| `settings.spec.js` | Settings cog opens the panel; About opens a modal; modal and panel close buttons work |
| `encouragement.spec.js` | Encourage Me button visibility, toast appearance, auto-dismiss, early dismiss, mutual dismiss with Tough Love |
| `tough-love.spec.js` | Tough Love button visibility, toast appearance, auto-dismiss, early dismiss, mutual dismiss with Encourage Me |
| `streak.spec.js` | Streak display, increment on completion, same-day no-op, existing streak from storage, persistence, settings panel UI, freeze date picker, settings persistence |

Each test clears localStorage and reloads before it runs, so tests are fully independent. There are 106 end-to-end tests in total.

### CI

→ [Testing](https://github.com/lauz9888/untangle/wiki/Testing) in the wiki explains the coverage approach and what sits at each level.
