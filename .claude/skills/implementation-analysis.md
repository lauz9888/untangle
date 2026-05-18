Review the completed implementation against the approved requirement and solution to confirm it is correct, complete, and maintainable.

This skill is part of the automated development workflow. It runs automatically after solution-implementation completes, or can be invoked manually with `/implementation-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

The `requirement_text`, `solution_text`, and `implementation_summary` fields define what was asked for and what was built. Both requirements and solution must be approved.

### 2. Review the implementation against the spec

Read the git diff since main:

```
git diff main...HEAD
```

For every changed file, verify:

- **Requirement coverage** — does the implementation deliver everything in `requirement_text`? Is anything missing?
- **Solution conformance** — does the implementation match the approach described in `solution_text`? If it deviated, was the deviation justified?
- **Correctness** — are there logic errors, off-by-one issues, unhandled edge cases described in the requirements?
- **Scope creep** — were any changes made beyond the agreed scope?

### 3. Fix any bugs found

For each bug found, trigger `/report-bug` with source `qa-review` before fixing it. Provide the title, file/line, and how it manifests. After the issue is created and the bug is fixed, continue the review.

### 4. Loop back if the gap is fundamental

If the implementation is missing something because the **requirement was ambiguous** (the gap was not visible during requirement-analysis):

```
node scripts/workflow-state.mjs loop-back requirement-analysis "Implementation review found requirement gap: [what is unclear or missing]"
```

If the implementation is missing something because the **solution design was wrong** (e.g. wrong files targeted, wrong abstraction used):

```
node scripts/workflow-state.mjs loop-back solution-analysis "Implementation review found solution design issue: [what needs to change in the approach]"
```

Tell the developer what happened. The Stop hook will route automatically.

### 5. Approve the implementation

When the implementation correctly delivers the approved requirement with no outstanding issues:

```
node scripts/workflow-state.mjs approve implementation
```

### 6. Confirm to the developer

Tell the developer: "Implementation verified. Moving to unit test analysis now."

The Stop hook will automatically start `/unit-test-analysis`.
