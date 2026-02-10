#!/bin/bash

# Check if src/ has changes compared to last successful deploy
if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- src/; then
  echo "No changes in src/ - skipping build"
  exit 0
fi

# Changes detected, run the build
echo "Changes detected in src/ - running build"
bun run build
