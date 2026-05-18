#!/bin/sh
# Manually approve the current branch for push/PR after a human code review.
# Runs unit tests (and optionally E2E tests) then writes the QA approval marker.
#
# Usage:
#   sh scripts/mark-qa-approved.sh          # unit tests only
#   sh scripts/mark-qa-approved.sh --e2e    # unit + E2E tests

set -e

run_e2e=false
for arg in "$@"; do
  case "$arg" in
    --e2e) run_e2e=true ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: sh scripts/mark-qa-approved.sh [--e2e]"
      exit 1
      ;;
  esac
done

branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "Already on main/master — no approval marker needed."
  exit 0
fi

# Resolve project root (worktree-aware — node_modules lives in the main repo)
git_dir=$(git rev-parse --git-dir)
# Capture HEAD now, before cd'ing to project_root (worktrees have a separate HEAD)
commit=$(git rev-parse HEAD | tr -d '[:space:]')
if [ -f "${git_dir}/commondir" ]; then
  common=$(cat "${git_dir}/commondir")
  project_root=$(cd "${git_dir}/${common}/.." && pwd)
else
  project_root=$(git rev-parse --show-toplevel)
fi

echo "Running unit tests..."
cd "$project_root" && npm test -- --run

if [ "$run_e2e" = true ]; then
  echo "Running E2E tests..."
  cd "$project_root" && npm run test:e2e
fi

safe_branch=$(echo "$branch" | tr '/' '_' | tr '\\' '_')
mkdir -p "${git_dir}/claude-qa"
printf '%s' "$commit" > "${git_dir}/claude-qa/${safe_branch}.approved"

echo ""
echo "QA approved for '${branch}' at ${commit}"
echo "You may now push and open a pull request."
