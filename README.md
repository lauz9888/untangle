# Untangle

A task manager designed for anyone who struggles with overwhelm, motivation, task initiation, or consistency — and built to be neurodivergent-friendly without being exclusively for neurodivergent people.

## What it does

Untangle helps you manage tasks in a way that respects how you actually feel, not just what's theoretically most important.

Tasks are organised across three columns:

- **Now** — what you're focusing on today
- **Next** — what's coming up
- **Future** — everything else, parked without pressure

Each task can have an **energy level** (tiny, small, medium, or large). You set your current energy in the header, and any task that needs more energy than you have right now is faded out — still visible, but clearly deprioritised. When you haven't set your energy for the day, nothing is faded.

When a task is done, you mark it complete with the ✓ button. It disappears from the board, a celebration popup appears in the centre of the screen, and the task is remembered for your history.

The **History panel** (opened from the header) shows a bar chart of how many tasks you completed each week for the past four weeks, and calls out your most productive week ever.

The **settings cog** (top-right corner) opens a side panel. The **About** entry gives a plain-language overview of what the app is and how it works.

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

Notification state lives in a separate composable (`useCelebration.js`), also a singleton. When a task is completed, `showCelebration()` picks one of 50 encouraging messages at random and displays it as a full-screen centred popup for 3.5 seconds. Clicking anywhere dismisses it early. Any previously running timer is cancelled so rapid completions don't stack.

Everything is saved to `localStorage` automatically whenever state changes, so nothing is lost on a page refresh. Completed tasks stay in storage (they're just hidden from the board columns) so the history panel can use them.

### Energy filtering

Energy levels have a numeric rank from 1 (tiny) to 4 (large). When you set your current energy, any task whose required energy is higher gets a reduced opacity. If you haven't set an energy level, nothing is filtered. The filtering is reactive — it updates immediately as you change your energy.

### Drag and drop

Drag and drop uses the browser's built-in drag-and-drop API with no external libraries. Dragging is disabled while a task is in edit mode.

### History panel

The History panel groups completed tasks by week (Monday–Sunday) and displays the count for each of the past four weeks as a bar chart. It also scans all completed tasks ever to find and display the most productive week.

---

## Testing

### Running tests

```bash
npm test           # Unit tests (watch mode)
npm run test:e2e   # End-to-end tests
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
| `settings/` | The SettingsPanel component — structure, About section toggle, and close behaviour |

Each feature folder has two files: one that tests the composable logic directly, and one that tests the components that render it. This split exists because the two test styles are technically incompatible — composable tests reset the module between each test to get fresh state, while component tests mock the composable entirely to isolate the component's rendering and event handling.

There are 148 unit tests in total.

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
| `settings.spec.js` | Settings cog opens the panel; About opens a modal; modal and panel can each be dismissed |

Each test clears localStorage and reloads before it runs, so tests are fully independent. There are 71 end-to-end tests in total.

### CI

Tests run automatically on every push via GitHub Actions, in three parallel jobs: unit tests, end-to-end tests, and a production build check.
