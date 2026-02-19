#!/usr/bin/env bash
set -euo pipefail

message="$(git log -1 --pretty=%B | tr -d '\r')"

if [[ "$message" == *"[deploy]"* ]]; then
  echo "[netlify-ignore] [deploy] tag found; running production deploy."
  exit 1
fi

echo "[netlify-ignore] No [deploy] tag in latest commit message; skipping production deploy."
echo "[netlify-ignore] Add [deploy] to commit message when you are ready to publish."
exit 0