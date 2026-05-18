Capture and validate the full requirements for a code change before any solution work begins.

This skill is part of the automated development workflow. It runs at the start of every change — either triggered automatically when a change request is detected, or invoked manually with `/requirement-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

If the state shows `loop_back_reason`, this is a loop-back from a later step (solution or implementation). Acknowledge this context upfront — e.g. "I was sent back here from solution-analysis because [reason]. Let me revisit the requirements with that in mind."

If `requirement_text` already has content, start from that as a draft rather than asking from scratch.

If no state exists yet, initialise it:

```
node scripts/workflow-state.mjs start
```

### 2. Establish the requirement

Ask the developer what they want to change or build. Keep asking until you have clear answers to all of:

- **What** — the exact behaviour or feature being added/changed/removed
- **Why** — the goal or problem this solves (helps detect scope creep later)
- **Scope** — what is explicitly out of scope (what should NOT change)
- **Acceptance criteria** — how you'll know when it's done correctly
- **Edge cases** — unusual inputs, states, or user paths that must be handled
- **Constraints** — performance requirements, accessibility needs, compatibility concerns

Ask one focused question at a time. Don't ask for everything at once.

If the developer's initial message already answers most of these, confirm your understanding rather than re-asking. For example: "I understand you want to [X], which should [Y], and it's done when [Z]. Is that right?"

### 3. Log a bug issue if the requirement is a bug fix

If the requirement describes something currently broken — incorrect behaviour, a visual defect, a crash, or anything the user is reporting as wrong — create a GitHub issue before proceeding:

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <concise one-sentence description>" \
  --body "<what was observed, where it manifests, steps to reproduce if known>" \
  --source "manual"
```

If the output starts with `EXISTS:N`, it's already tracked as issue #N — note the number and continue.
If the output starts with `CREATED:N`, note the number. The issue will be closed automatically when a commit message contains `Fixes #N`, or manually via `/report-bug` after the fix lands.

If the requirement is a new feature or enhancement (nothing is currently broken), skip this step.

### 4. Review for conflicts

Once you have the requirement, check the codebase for anything that could contradict or interfere with it:

```
git diff main...HEAD --name-only
```

Read the relevant source files and identify:
- Existing functionality that overlaps with or depends on what's being changed
- State, events, or composables that the change will touch
- Other features that could break if the change is implemented naively

If you find a conflict or dependency, raise it explicitly: "This change will affect [X], which is also used by [Y]. We need to decide whether [Y] should change too."

### 5. Save the approved requirements

When the developer confirms the requirements are correct, write a concise but complete summary to state:

```
node scripts/workflow-state.mjs set requirement_text "SUMMARY: <what>. GOAL: <why>. SCOPE: <what's in/out>. ACCEPTANCE: <criteria>. CONSTRAINTS: <any>."
```

Then approve the requirement step to trigger solution-analysis automatically:

```
node scripts/workflow-state.mjs approve requirement
```

### 6. Confirm to the developer

Tell the developer: "Requirements approved. Moving to solution analysis now."

The Stop hook will automatically start `/solution-analysis`.
