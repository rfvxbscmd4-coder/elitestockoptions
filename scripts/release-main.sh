#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/release-main.sh \"Release message\""
  exit 1
fi

release_message="$1"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "[release] Working tree has uncommitted changes. Commit or stash first."
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "[release] Current branch: $branch"

git fetch origin main --quiet

ahead_count="$(git rev-list --count origin/main..HEAD)"
if [[ "$ahead_count" == "0" ]]; then
  echo "[release] No commits ahead of origin/main. Nothing to release."
  exit 0
fi

echo "[release] Commits to publish: $ahead_count"
echo "[release] Recent commits:"
git --no-pager log --oneline --max-count=8 origin/main..HEAD

echo ""
echo "[release] Creating release marker commit with [deploy] tag..."
git commit --allow-empty -m "[deploy] ${release_message}"

echo "[release] Pushing HEAD to origin/main ..."
git push origin HEAD:main
echo "[release] Done. Netlify should run one production deploy."