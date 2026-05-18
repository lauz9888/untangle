# Change report: Block workflow auto-advance when a question is awaiting an answer

**PR**: [#39](https://github.com/lauz9888/untangle/pull/39) · **Merged**: 2026-05-18 · **Commit**: [`fc78004`](https://github.com/lauz9888/untangle/commit/fc780044013d6932a57064696b7b3a0d4864db7b)

## What changed

`scripts/workflow-state.mjs` gained two new commands — `await-input` and `clear-awaiting` — and a new `awaiting_input` field in workflow state. The `check-transition` stop hook now exits without advancing when `awaiting_input` is set; `check-prompt` surfaces the pending question in context on resume; and `approve` always clears the flag automatically. The `requirement-analysis`, `solution-analysis`, and `document-analysis` skills were updated to register each blocking question with `await-input` before asking it and `clear-awaiting` when the answer arrives.

## Why

The stop hook (`check-transition`) fired as soon as Claude ended a turn, advancing to the next workflow step regardless of whether a question had been asked. The immediate trigger was `approve docs` setting `pending_next_step` before the deploy-path question was asked — so the hook auto-advanced past it without waiting for the developer's answer.

## Bug analysis

No bugs were raised during this change.

This is a workflow infrastructure fix — no user-facing source code was modified. The absence of bugs reflects the nature of the change: the only testable artefact was the `workflow-state.mjs` script logic, which was verified directly via command-line invocation before commit. Lack of automated test coverage for the workflow scripts means bugs in this area are likely to surface through use rather than through CI, which is a pattern worth watching across future workflow changes.
