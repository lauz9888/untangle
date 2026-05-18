Implement the approved solution as described by solution-analysis.

This skill is part of the automated development workflow. It runs automatically after solution-analysis completes, or can be invoked manually with `/solution-implementation`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

The `requirement_text` and `solution_text` fields are your spec. Both must be approved before proceeding. If either is missing or not approved, tell the developer and stop.

### 2. Re-read every file you will touch

Before writing a single line, read the full content of every file mentioned in `solution_text`. Understand the existing patterns — naming conventions, composable structure, component style, test setup. Match them exactly.

### 3. Implement the change

Work through the files in `solution_text` in a logical order (data layer first, then UI, then config). Make only the changes needed to deliver the approved requirement — no refactoring of surrounding code, no extra abstractions, no "while I'm here" cleanups.

If you encounter something unexpected that makes the planned approach unworkable, **stop and loop back rather than improvising**. See step 4.

If you spot a pre-existing bug (not introduced by your change), trigger `/report-bug` with source `development` before fixing it. After the issue is created and fixed, continue with the implementation.

### 4. Loop back if blocked

**If you need more information about the requirement:**

```
node scripts/workflow-state.mjs loop-back requirement-analysis "During implementation discovered [specific gap]: [details]"
```

Tell the developer what happened. The Stop hook will route back to `/requirement-analysis` automatically.

**If the planned solution needs to change:**

```
node scripts/workflow-state.mjs loop-back solution-analysis "The planned approach won't work because [reason]. Need to redesign [aspect]."
```

Tell the developer what happened. The Stop hook will route back to `/solution-analysis` automatically.

### 5. Save the implementation summary and advance

When the implementation is complete, write a brief summary of what changed:

```
node scripts/workflow-state.mjs set implementation_summary "Changed [files]. Added [what]. Modified [what]. Removed [what]."
```

Queue implementation-analysis as the next step:

```
node scripts/workflow-state.mjs set pending_next_step "implementation-analysis"
```

### 6. Confirm to the developer

Tell the developer: "Implementation complete. Moving to implementation analysis now."

The Stop hook will automatically start `/implementation-analysis`.
