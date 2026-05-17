#!/bin/sh
cp scripts/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge
cp scripts/post-checkout .git/hooks/post-checkout
chmod +x .git/hooks/post-checkout
echo "Git hooks installed."
