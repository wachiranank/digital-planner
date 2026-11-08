#!/usr/bin/env bash
# Database backup to ./backups (keeps 14 days). Copy the folder off the server too (e.g. rclone to R2).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
f="backups/db-$(date +%F-%H%M).dump"
docker compose exec -T db pg_dump -U postgres -d postgres -Fc --exclude-schema=_analytics > "$f"
find backups -name 'db-*.dump' -mtime +14 -delete
echo "backup → $f ($(du -h "$f" | cut -f1))"
# restore: docker compose exec -T db pg_restore -U postgres -d postgres --clean --if-exists < backups/<file>.dump
