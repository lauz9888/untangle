---
name: solution-refactor
description: Step 7 of the dev pipeline. Reviews the implementation for coding standards and cleanliness, reruns unit tests, and loops back to solution-implementation if the refactor breaks anything.
---

Step 7 of the pipeline in `CLAUDE.md`. Runs after `solution-implementation` reaches green.

## Steps

1. Review every file changed for this workflow against `CLAUDE.md` conventions and general quality: no dead code, no premature abstraction, no unnecessary comments, consistent naming, DRY within reason, no leftover debug statements.
2. Apply the cleanups directly.
3. Run `npm test -- run`.
4. **If refactoring broke a test**:
   - `node scripts/bug-tracker.mjs create refactor "<title>" "<what broke>"`
   - `node scripts/workflow-state.mjs set resume_after_fix refactor`
   - `node scripts/workflow-state.mjs set loopback_reason "<what broke and why>"`
   - `node scripts/workflow-state.mjs loopback implementation "<reason>"`
   - Invoke `solution-implementation` via the Skill tool.
   - Close the bug once tests are green again on the next refactor pass.
5. **If everything stays green**:
   - `node scripts/workflow-state.mjs approve refactor`
   - Invoke `e2e-test-analysis` via the Skill tool.
