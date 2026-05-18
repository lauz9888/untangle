Review end-to-end tests for the completed change and update them as needed.

This skill is part of the automated development workflow. It runs automatically after unit-test-analysis completes, or can be invoked manually with `/e2e-test-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`unit_tests_done` must be true before proceeding.

Determine the project root for running npm commands (handles worktrees):

```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

### 2. Identify which e2e tests are affected

Read all files in `tests/e2e/` and cross-reference with the git diff:

```
git diff main...HEAD --name-only
```

An e2e test needs to change when:
- A user-visible feature is added or changed
- A new interaction flow exists (drag, edit, delete, toggle, form submission)
- A bug fix addresses something a user would notice

E2E tests live in `tests/e2e/<feature>.spec.js` and use shared helpers from `tests/e2e/helpers.js`. Every test clears `localStorage` and reloads before running. Read existing tests before writing new ones and match their patterns exactly.

### 3. Make the required changes

Add, remove, or update e2e tests to cover the change. If no e2e test changes are needed, note this and skip to step 5.

### 4. Run the affected tests

Derive the list of changed or added e2e spec files:

```
git diff main...HEAD --name-only | grep '^tests/e2e/.*\.spec\.js$'
```

If the list is empty, skip the run — no e2e tests were touched, so there is nothing to verify here. Note this and move on.

If files are listed, run only those files (space-separated):

```
cd $project_root && npm run test:e2e -- <file1> <file2> ...
```

Do not run the full suite at this step — the full suite runs in CI via `/deploy-branch` and `/deploy-main`.

If a test fails because of a real bug in the source, trigger `/report-bug` with source `e2e-test` before fixing. Provide the test file, line, failure message, and what the test exercises. After the issue is created and the bug is fixed, re-run to confirm the tests pass.

### 5. Advance to document analysis

```
node scripts/workflow-state.mjs approve e2e-tests
```

### 6. Confirm to the developer

Tell the developer: "E2E tests updated and passing. Moving to documentation review now."

The Stop hook will automatically start `/document-analysis`.
