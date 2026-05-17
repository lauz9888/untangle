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

The header also has an **Encourage Me** button (gentle, low-pressure messages) and a **Tough Love** button (firm-but-kind pushback against procrastination) — both appear as toasts and are mutually exclusive.

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

Vue 3 + Vite, no UI framework, plain CSS with custom properties for theming. All task state lives in a single composable (`useTasks.js`) that acts as a module-level singleton — every component that calls it shares the same reactive refs. Notification state (celebration, encouragement, tough love) follows the same pattern in separate composables. Everything is saved to `localStorage` automatically on every state change.

→ [Architecture](https://github.com/lauz9888/untangle/wiki/Architecture) and [Data Model](https://github.com/lauz9888/untangle/wiki/Data-Model) in the wiki cover the design in detail.

---

## Testing

```bash
npm test           # unit tests (Vitest, watch mode)
npm run test:e2e   # end-to-end tests (Playwright)
```

Unit tests cover composable logic and component rendering in isolation. E2E tests cover complete user workflows in a real browser, including drag-and-drop, localStorage persistence across reloads, and real timer behaviour. Tests run automatically on every push via GitHub Actions.

→ [Testing](https://github.com/lauz9888/untangle/wiki/Testing) in the wiki explains the coverage approach and what sits at each level.
