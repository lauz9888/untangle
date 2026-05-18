Review unit tests for the completed change and update them as needed.

This skill is part of the automated development workflow. It runs automatically after implementation-analysis completes, or can be invoked manually with `/unit-test-analysis`.

## Steps

### 1. Read current workflow state

```
node scripts/workflow-state.mjs get
```

`implementation_approved` must be true before proceeding.

Determine the project root for running npm commands. In a worktree, `node_modules` lives in the main repo, not the worktree checkout:

```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

### 2. Identify which unit tests are affected

Read all files in `tests/unit/` and cross-reference with the git diff:

```
git diff main...HEAD --name-only
```

A unit test file needs to change when:
- A composable has new or changed logic (filtering, state transitions, computed values, side effects)
- A component has new conditional rendering, new props, or new emits

Unit tests in this project always come in pairs under `tests/unit/<feature>/`:
- `composable.test.js` — uses `vi.resetModules()` for fresh state isolation
- `components.test.js` — uses `vi.mock(...)` to mock the composable entirely

Read existing tests to understand naming and setup patterns before writing new ones. Match them exactly.

### 3. Make the required changes

Add, remove, or update tests to reflect the change. If no test changes are needed (the existing suite already covers the new behaviour), note this and skip to step 5.

### 4. Run the affected tests

Run only the test files that were changed or are directly related to the change:

```
cd $project_root && npm test -- --run --reporter=verbose <test-file-pattern>
```

If any test fails, trigger `/report-bug` with source `unit-test` before fixing. Provide the test file, line, failure message, and what the test exercises. After the issue is created and the failure is resolved, re-run the tests to confirm they pass.

### 5. Advance to e2e test analysis

```
node scripts/workflow-state.mjs approve unit-tests
```

### 6. Confirm to the developer

Tell the developer: "Unit tests updated and passing. Moving to e2e test analysis now."

The Stop hook will automatically start `/e2e-test-analysis`.
