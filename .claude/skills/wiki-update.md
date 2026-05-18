Review the wiki against recent changes to main and update any pages that are out of date. Use this after a direct push to main (the GitHub Actions workflow handles PR merges automatically).

## Steps

### 1. Get the changes to review

```
git log main..HEAD --oneline   # if on a branch
git log -5 --oneline           # if already on main, recent commits
git diff HEAD~1..HEAD          # diff of the last commit
```

If reviewing a specific commit range, ask the user which commits to cover.

### 2. Clone or update the wiki

Check whether `./wiki/` already exists:
- If not: `git clone https://github.com/lauz9888/untangle.wiki.git wiki`
- If yes: `git -C wiki pull`

### 3. Run the update script

```
node scripts/update-wiki.mjs
```

This calls the Claude API to analyse the diff against all wiki pages and updates any that are out of date. It requires `ANTHROPIC_API_KEY` to be set.

If the API key is not available, do the review manually:

Read each wiki page and the diff, then update any page where:
- A described feature now works differently
- A new feature exists that the wiki doesn't mention
- A command, file path, or architectural concept has changed
- Something documented is now wrong or misleading

Do not update for internal refactors, test additions, dependency bumps, or CI changes that don't affect what the wiki describes.

### 4. Commit and push wiki changes

```
cd wiki
git add -A
git commit -m "Wiki: reflect <brief description of the change>"
git push
cd ..
```

### 5. Report

Say which pages were updated and why, or confirm that no updates were needed.
