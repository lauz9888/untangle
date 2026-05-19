Review and update documentation to reflect the completed change, then confirm the developer's preferred deployment path.

This skill is part of the automated development workflow. It runs automatically after e2e-test-analysis completes, or can be invoked manually with `/document-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`e2e_tests_done` must be true before proceeding.

### 2. Review documentation

Check every `.md` file that was touched in the branch, plus `README.md` and `CLAUDE.md` regardless of whether they were changed:

```
git diff main...HEAD --name-only
```

For each doc, ask:
- Does it describe something that now works differently?
- Is there a new feature, command, file, or architectural concept that should be mentioned?
- Is there anything now incorrect or misleading?

Update where the answer is yes. Only document user-facing or contributor-facing information — not internal implementation details.

If the change adds a new skill, updates workflow state commands, or changes the development workflow itself, update the **Developer workflow** section in `CLAUDE.md`.

### 3. Advance the docs step

```
node scripts/workflow-state.mjs approve docs
```

### 4. Summarise and route to deployment

Give the developer a concise summary of everything done in this workflow:
- What was built (the requirement)
- What changed (files modified)
- Test results (unit + e2e)
- Doc updates made (or "none needed")

Then determine whether this is a code change or a doc-only change:

```bash
non_doc=$(git diff main...HEAD --name-only | grep -vE '\.(md|txt)$|^reports/')
```

**If `non_doc` is non-empty (code change):**

Route directly to deploy-branch — no question needed:

```
node scripts/workflow-state.mjs set pending_next_step "deploy-branch"
```

Tell the developer:

> "Deploying to a branch for browser verification. I'll let you know when it's ready to test."

The Stop hook will automatically start `/deploy-branch`.

**If `non_doc` is empty (doc-only change):**

Register the question so the workflow is blocked until the developer answers:

```
node scripts/workflow-state.mjs await-input "Doc-only change — deploy directly to main, or deploy to a branch first?"
```

Then ask:

> "This change only affects documentation. How would you like to deploy?
> - **Deploy directly to main** *(default for doc changes)* — no browser verification needed.
> - **Test manually first** — I'll deploy to a branch so you can verify before merging."

End your turn. Do not continue until the developer responds.

### 5. Route doc-only changes (after developer answers)

When the developer answers, first clear the awaiting state:

```
node scripts/workflow-state.mjs clear-awaiting
```

If the developer wants to test manually:
```
node scripts/workflow-state.mjs set pending_next_step "deploy-branch"
```
Tell them: "Deploying to a branch for manual testing now."

If the developer wants to deploy directly to main:
```
node scripts/workflow-state.mjs set pending_next_step "deploy-main"
```
Tell them: "Running the full pipeline and deploying to main now."

The Stop hook will automatically start the appropriate deployment skill.
