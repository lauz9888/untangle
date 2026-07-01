---
name: wiki-update
description: Diffs the latest merged change against every page in the GitHub wiki and updates any page that's now out of date. Invoked automatically by deploy-main, or manually after a direct wiki edit.
---

The GitHub wiki (`https://github.com/lauz9888/untangle/wiki`) is a separate git repository from the app code, and CI cannot edit it (no Claude access inside GitHub Actions — see `CLAUDE.md`'s documentation-check note). This skill runs locally instead.

## Steps

1. Clone or pull the wiki repo into a scratch directory outside the app's git tree, e.g. `.claude/wiki-scratch/` (gitignored) — `git clone https://github.com/lauz9888/untangle.wiki.git .claude/wiki-scratch` if it doesn't exist yet, otherwise `git -C .claude/wiki-scratch pull`.
2. Get the diff of what just merged: `git log -1 --stat` / `git diff <previous-main-sha>..HEAD` on the app repo.
3. For each page in the wiki, check whether its claims still hold against the current codebase and `CLAUDE.md` — not just the latest diff, since a page can also be stale from an earlier change that was missed.
4. Update any page that's now inaccurate. Leave accurate pages untouched.
5. If anything changed: commit in the wiki scratch clone and push directly to its `master` branch (the wiki has no branch protection or PR flow).
6. Report which pages were updated, if any, back to the calling context (`deploy-main` or the user, if run manually).

Run manually with `/wiki-update` any time after a direct wiki edit, to reconcile it against the current code.
