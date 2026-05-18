Design the implementation approach for the approved requirement before any code is written.

This skill is part of the automated development workflow. It runs automatically after requirement-analysis completes, or can be invoked manually with `/solution-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

The `requirement_text` field contains the approved requirements. If it is empty or `requirement_approved` is false, stop and tell the developer: "Requirements have not been approved yet. Please run `/requirement-analysis` first."

If `loop_back_reason` is set, this is a loop-back from implementation. Acknowledge why: "I was sent back here from [loop_back_from] because [loop_back_reason]. I'll revise the solution with that in mind."

### 2. Explore the codebase

Read all files that will be touched by the change. Build a picture of:

- The exact functions, composables, and components involved
- How data flows through the affected code
- What tests already cover this area
- What the simplest correct change looks like

Don't guess — read the actual files.

### 3. Identify solution options

Propose 1–3 concrete approaches. For each, describe:

- What changes in which files
- The main advantage (simpler, faster, more maintainable)
- The main trade-off or risk

If one option is clearly best, say so and explain why. Don't manufacture fake alternatives just to show options.

### 4. Assess non-functional risks

For each solution option under consideration, check the following areas and flag any concerns. For each concern raised, include a concrete mitigation as part of the solution design — not as a future consideration.

**Reactivity and state correctness**
- Does the change mutate arrays or objects in ways Vue's reactivity won't detect? (Direct index assignment, `delete`, spreading reactive objects)
- Could destructuring a composable's return value lose reactivity?
- Does the change introduce state that two composables or components could get out of sync?

**Performance**
- Does the change add reactive computations that will re-run on every keystroke or render cycle?
- Are there loops, filters, or sorts inside computed properties or watchers that could be expensive on large task lists?
- Does anything now run in a Vue template expression that should be a `computed`?

**Persistence and data integrity**
- Does the change affect localStorage keys, data shapes, or serialisation formats? If so, will existing stored data still load correctly, or does it need a migration?
- Could the change silently discard a user's saved data if they have an older format?

**Accessibility**
- Does the change add or modify interactive elements? If so, are keyboard navigation and focus management preserved?
- Are ARIA attributes, roles, or labels needed for new UI elements?
- Does any new dynamic content need to be announced to screen readers?

**Test stability**
- Does the change introduce timing dependencies (setTimeout, async state, animations) that could make tests flaky?
- Does it rely on order of operations or global state that tests reset differently?

**Security**
- Is any user-provided string rendered as HTML? If so, is it sanitised?
- Is anything read from localStorage treated as trusted? Validate the shape before use.

If any concern has no clear mitigation, raise it with the developer before proceeding. If a concern requires a requirement decision, loop back:

```
node scripts/workflow-state.mjs loop-back requirement-analysis "Non-functional risk identified that needs a requirement decision: [risk and options]"
```

### 5. Ask about unknowns

If the solution has open questions the developer needs to decide — naming, UI behaviour, data model shape, whether an existing abstraction should be extended or replaced — ask now, not during implementation.

Before asking each question, register it so the workflow is blocked until the developer answers:

```
node scripts/workflow-state.mjs await-input "<the question you are about to ask>"
```

Then ask the question and end your turn. Do not continue until the developer responds. When the answer arrives, call:

```
node scripts/workflow-state.mjs clear-awaiting
```

Then either ask the next question (repeating the await-input pattern) or proceed to step 6 if the solution is fully specified.

If you discover that the requirements are incomplete or contradictory and that's blocking solution design, loop back:

```
node scripts/workflow-state.mjs loop-back requirement-analysis "Need clarification on [specific gap] before the solution can be designed"
```

Then tell the developer what's happening. The Stop hook will route back to `/requirement-analysis` automatically.

### 6. Save the approved solution

When the developer agrees on the approach, write a concise summary to state — including any non-functional risks and their mitigations:

```
node scripts/workflow-state.mjs set solution_text "APPROACH: <what will change>. FILES: <list>. RATIONALE: <why this approach>. DECISIONS: <any options that were decided>. NFR MITIGATIONS: <risks identified and how each is addressed, or 'none identified'>."
```

Then approve to trigger implementation automatically:

```
node scripts/workflow-state.mjs approve solution
```

### 7. Confirm to the developer

Tell the developer: "Solution approved. Starting implementation now."

The Stop hook will automatically start `/solution-implementation`.
