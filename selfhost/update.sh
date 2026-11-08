#!/usr/bin/env bash
# Pull the newest images + kit, apply new database migrations, restart. Takes a backup first.
set -euo pipefail
cd "$(dirname "$0")"
./backup.sh
git pull --ff-only 2>/dev/null || true   # newer compose file / migrations (if the kit is a git checkout)
docker compose pull
docker compose up -d --remove-orphans     # migrate runs again and applies only new files
docker image prune -f >/dev/null
echo "updated ✓"
