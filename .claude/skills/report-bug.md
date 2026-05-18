Create a GitHub issue for any bug, wherever it was found.

This skill is triggered automatically by workflow skills when they identify a bug, and can be run manually by the developer with `/report-bug` at any time.

## Bug sources

Each context maps to a source label used to track where bugs are detected:

| Where the bug was found | Source value |
|---|---|
| During code writing (`/solution-implementation`) | `development` |
| During code review (`/implementation-analysis`) | `qa-review` |
| Unit test failure (`/unit-test-analysis`) | `unit-test` |
| E2E test failure (`/e2e-test-analysis`) | `e2e-test` |
| Unit test failure during CI (`/deploy-branch`, `/deploy-main`) | `ci-unit-tests` |
| E2E test failure during CI (`/deploy-branch`, `/deploy-main`) | `ci-e2e-tests` |
| Developer found during manual browser testing | `manual` |

## Steps

### 1. Gather bug details

**If triggered by a workflow skill**, the triggering skill provides:
- Source (from the table above)
- A concise one-sentence title
- What was observed, which file and line, how it manifests

Use this information directly — do not ask the developer to repeat it.

**If run manually by the developer**, ask for:
- A concise description of the bug (one sentence, becomes the issue title)
- What they observed (actual behaviour)
- What they expected to happen
- Where in the code this seems to be (file and line if known)
- Steps to reproduce, if known

### 2. Create the issue

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <concise description>" \
  --body "<observed behaviour, file/line, how it manifests>" \
  --source "<source value from table>"
```

If the output starts with `EXISTS:N` — already tracked as issue #N. Note the number and continue.
If the output starts with `CREATED:N` — now tracked as issue #N. Note the number and continue.

### 3. Fix the bug

Fix the underlying issue. Keep the fix minimal and targeted — do not refactor surrounding code.

### 4. Close the issue

```
node scripts/bug-tracker.mjs close \
  --number <N> \
  --cause "<root cause — why the bug existed>" \
  --fix "<what was changed to fix it>"
```

### 5. Return or advise

**If triggered by a workflow skill:** return to that skill and continue from where you left off. The issue is now resolved.

**If run manually:** tell the developer "Bug logged as issue #N. To close it automatically, include `Fixes #N` in your commit message."
