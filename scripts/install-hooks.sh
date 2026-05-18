#!/bin/sh
if [ ! -d ".git/hooks" ]; then
  echo "No .git/hooks directory found; skipping hook install."
  exit 0
fi
cp scripts/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge
cp scripts/post-checkout .git/hooks/post-checkout
chmod +x .git/hooks/post-checkout
cp scripts/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo "Git hooks installed."
