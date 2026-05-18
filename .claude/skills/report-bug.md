Create a GitHub issue for a bug found during manual testing.

## Steps

### 1. Gather bug details

Ask the user for:
- A concise description of the bug (one sentence, will become the issue title)
- What they observed (actual behaviour)
- What they expected to happen
- Steps to reproduce, if known

If the user already provided this in their message, skip asking and use what they gave you.

### 2. Create the issue

Construct a title in the format `Bug: <concise description>` (capitalise the first word after "Bug:").

Build a markdown body:

```
**Observed behaviour:** <what the user saw>

**Expected behaviour:** <what should have happened>

**Steps to reproduce:**
<numbered list, or "not yet determined" if unknown>
```

Then run from the project root:

```
node scripts/bug-tracker.mjs create \
  --title "Bug: <title>" \
  --body "<body>" \
  --source "manual"
```

If the output starts with `EXISTS:N`, tell the user the bug is already tracked as issue #N and give them the GitHub link.

If the output starts with `CREATED:N`, confirm to the user: "Bug logged as issue #N: <GitHub issue URL>".

The GitHub issue URL format is: `https://github.com/<owner>/<repo>/issues/<N>`. Resolve `<owner>/<repo>` with:

```
gh repo view --json nameWithOwner -q .nameWithOwner
```

### 3. Advise next steps

Tell the user: when a fix is committed, include `Fixes #N` in the commit message and the issue will be closed automatically with the fix details.
