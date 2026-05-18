Review and fix all code changes on the current branch, ensure tests and docs are in place, and issue a QA approval marker so a pull request can be created.

## Steps

### 1. Identify what changed

```
git diff main...HEAD --name-only
git diff main...HEAD
```

List every changed file. Group them by type: source files, tests, docs, config.

Also determine the project root for running npm commands. In a worktree, `node_modules` lives in the main repo, not the worktree checkout:

```
git_dir=$(git rev-parse --git-dir)
if [ -f "${git_dir}/commondir" ]; then
  # Running in a worktree — resolve main repo root via commondir
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi
```

Use `$project_root` as the working directory for all `npm` commands in the steps below.

### 2. Code quality review

For every changed source file, look for:

- **Contradictory logic** — conditions that can never be true, branches that undo each other, state that is set and then immediately overwritten
- **Vague logic** — magic numbers or strings with no named constant, boolean arguments to functions where the meaning is unclear at the call site, variable names that don't reflect what they hold
- **Inefficiency** — unnecessary reactive re-computation in Vue composables, repeated identical lookups inside loops, derived state that is recomputed instead of cached
- **Flakiness** — code that depends on timing, ordering of async operations, or global state without proper reset
- **Maintainability** — deeply nested conditionals that could be early-returned, large functions doing multiple unrelated things, dead code (unused imports, unreachable branches, commented-out blocks)

For each bug found, **before fixing it**, create a GitHub issue:

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <concise one-line description>" \
  --body "<what the bug is, which file and line, how it manifests>" \
  --source "qa-review"
```

The output will be `CREATED:N` (new issue) or `EXISTS:N` (already tracked). Note the issue number.

Fix every issue you find. Prefer minimal targeted edits — don't refactor surrounding code that isn't part of the change.

After fixing each bug, close its issue with the root cause and fix details:

```
node scripts/bug-tracker.mjs close \
  --number <N> \
  --cause "<root cause — why the bug existed>" \
  --fix "<what was changed to fix it>"
```

### 3. Test coverage check

Determine whether the changed code needs new or updated tests.

**Unit tests are needed when:**
- A composable has new or changed logic (filtering, state transitions, computed values, side effects)
- A component has new conditional rendering, new props, or new emits

**E2E tests are needed when:**
- A user-visible feature is added or changed
- A new interaction flow exists (drag, edit, delete, toggle)
- A bug fix addresses something a user would notice

**Test structure for this project:**
- Unit tests live in `tests/unit/<feature>/` as two files: `composable.test.js` (uses `vi.resetModules()`) and `components.test.js` (uses `vi.mock(...)`)
- E2E tests live in `tests/e2e/<feature>.spec.js` and use helpers from `tests/e2e/helpers.js`
- See existing tests for naming, structure, and setup patterns — match them exactly

If tests are needed and don't exist, write them now. If existing tests cover the change, verify they still pass. Run from `$project_root`:
```
cd $project_root && npm test -- --run          # unit tests
cd $project_root && npm run test:e2e           # e2e tests
```

If a test fails because of a real bug in the source code (not a test setup issue), create a GitHub issue for it before fixing:

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <failing test name — what it expected vs what happened>" \
  --body "<test file and line, failure message, what the test exercises>" \
  --source "unit-test"   # or "e2e-test"
```

After fixing the source bug, close the issue:

```
node scripts/bug-tracker.mjs close \
  --number <N> \
  --cause "<root cause>" \
  --fix "<what was changed>"
```

### 4. Documentation review

Check every `.md` file that was changed in the branch, plus `README.md` and `CLAUDE.md` regardless of whether they were touched.

For each doc, ask:
- Does it describe something that now works differently?
- Is there a new feature, command, file, or architectural concept that should be mentioned?
- Is there anything that's now wrong or misleading?

Update docs where the answer is yes. Don't add docs for internal implementation details — only user-facing or contributor-facing information.

### 5. Final verification

Run from `$project_root`:
```
cd $project_root && npm test -- --run
```

If you created or modified any E2E tests, also run:
```
cd $project_root && npm run test:e2e
```

If any test fails due to a source bug, create a GitHub issue (as in Step 3) before fixing it, then close it after.

### 6. Write the approval marker

If all steps above are clean (issues fixed, tests passing, docs current), write the QA approval marker:

```
git rev-parse --git-dir   # get the git directory
```

Create the directory `<git-dir>/claude-qa/` if it doesn't exist, then write a file named `<safe-branch>.approved` where `<safe-branch>` is the branch name with `/` and `\` replaced by `_`.

The file should contain only the current commit hash (from `git rev-parse HEAD`), with no trailing newline or whitespace.

Example for branch `feature/my-task` at commit `abc123`:
- File: `.git/claude-qa/feature_my-task.approved`
- Content: `abc123def456...` (full 40-char hash)

### 7. Report

End with a summary:
- Issues found and fixed (or "none found")
- Tests created (or "existing tests sufficient" / "no tests needed")
- Docs updated (or "no updates needed")
- QA result: APPROVED or BLOCKED (with reason if blocked)

If blocked, explain exactly what needs to be resolved before the PR can be created.
