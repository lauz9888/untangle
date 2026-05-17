#!/bin/sh
cp scripts/post-merge .git/hooks/post-merge
chmod +x .git/hooks/post-merge
echo "Git hooks installed."
