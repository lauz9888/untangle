---
name: requirement-analysis
description: Step 1 of the dev pipeline. Turns a change request into a clear, testable requirement, looping with the user until they explicitly approve it.
---

You are running step 1 of the 14-stage pipeline documented in `CLAUDE.md`. This skill is triggered automatically whenever the user asks for a change (new feature, bug fix, performance enhancement), or manually via `/requirement-analysis`.

## Steps

1. If there's no active workflow (`node scripts/workflow-state.mjs get` errors), start one: `node scripts/workflow-state.mjs start`.
2. Read the relevant existing code and docs (`CLAUDE.md`, related `src/` files) so the requirement is grounded in what actually exists today, not assumptions.
3. Draft a clear, testable requirement — or a small set of them if the request naturally splits. Be specific enough that solution-design and unit-test-analysis can work from it without re-asking the basics.
4. If anything is ambiguous (scope, edge cases, UX details), ask the user via `AskUserQuestion` rather than guessing.
5. Present the refined requirement(s) to the user and explicitly ask them to confirm or push back.
6. **If the user disagrees or asks for changes**: this is a requirement bug.
   - `node scripts/bug-tracker.mjs create requirement "<short title>" "<what was wrong/missing>"`
   - Revise the requirement based on their feedback and present it again — loop back to step 5.
   - Once they approve, close the bug: `node scripts/bug-tracker.mjs close <number> "<how it was resolved>"`.
7. **Once the user explicitly approves**:
   - `node scripts/workflow-state.mjs set requirement_text "<final requirement, one paragraph or bullet list>"`
   - `node scripts/workflow-state.mjs approve requirement`
   - Invoke `solution-design` via the Skill tool to continue the pipeline automatically.

Never skip the explicit approval step — silence or moving on to design without a clear "yes" from the user is not approval.
