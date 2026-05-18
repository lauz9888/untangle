#!/bin/sh
# Checks whether the current branch has a valid QA approval marker.
# Exits 0 if approved, 1 (with a message) if not.

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Only enforce on non-main branches
if [ -z "$branch" ] || [ "$branch" = "HEAD" ] || [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  exit 0
fi

safe_branch=$(echo "$branch" | tr '/' '_' | tr '\\' '_')
git_dir=$(git rev-parse --git-dir 2>/dev/null)
marker="${git_dir}/claude-qa/${safe_branch}.approved"
current_commit=$(git rev-parse HEAD 2>/dev/null)

if [ ! -f "$marker" ]; then
  echo ""
  echo "QA REVIEW REQUIRED"
  echo "  Branch '${branch}' has not been QA reviewed."
  echo "  Run /qa-review in Claude Code before creating a pull request."
  echo ""
  exit 1
fi

approved_commit=$(cat "$marker" | tr -d '[:space:]')
if [ "$approved_commit" != "$current_commit" ]; then
  echo ""
  echo "QA APPROVAL STALE"
  echo "  New commits have been added since the last QA review."
  echo "  Approved commit: ${approved_commit}"
  echo "  Current commit:  ${current_commit}"
  echo "  Re-run /qa-review in Claude Code before creating a pull request."
  echo ""
  exit 1
fi

echo "QA approved for ${branch} at ${current_commit}"
exit 0
