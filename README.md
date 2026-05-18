# Untangle

A task manager designed for anyone who struggles with overwhelm, motivation, task initiation, or consistency — built to be neurodivergent-friendly without being exclusively for neurodivergent people.

Tasks are organised across three columns (Now, Next, Future) and can have an energy level. Set your current energy in the header and anything that needs more than you have right now is faded out — still visible, but deprioritised. Complete a task and it's gone from the board, logged to your history, and counted toward your streak.

---

## Using Untangle

Untangle runs in your browser. No account, login, or internet connection required — all data is stored locally.

```
npm install
npm run dev
```

Then open `http://localhost:5173`.

---

## Making changes

```
npm run dev        # dev server with hot reload
npm test           # unit tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright)
```

Before pushing any branch, run `/qa-review` in Claude Code. The pre-push hook will block if it hasn't been run.

---

## Wiki

Full documentation lives in the [Untangle wiki](https://github.com/lauz9888/untangle/wiki):

- [Architecture](https://github.com/lauz9888/untangle/wiki/Architecture)
- [Data Model](https://github.com/lauz9888/untangle/wiki/Data-Model)
- [Testing](https://github.com/lauz9888/untangle/wiki/Testing)
