#!/usr/bin/env bash
# Safely put a secret into .env without it showing on screen, then apply it.
#   ./set-secret.sh GOOGLE_CLIENT_SECRET
set -euo pipefail
cd "$(dirname "$0")"
key="${1:?usage: ./set-secret.sh KEY_NAME}"
[[ "$key" =~ ^[A-Z0-9_]+$ ]] || { echo "invalid key name"; exit 1; }
read -rsp "Paste value for $key (hidden), then Enter: " val; echo
[ -n "$val" ] || { echo "empty — nothing changed"; exit 1; }
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
if grep -q "^${key}=" .env; then
  awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k{print k"="v; next} {print}' .env > "$tmp"
else
  cp .env "$tmp"; printf '%s=%s\n' "$key" "$val" >> "$tmp"
fi
cat "$tmp" > .env
echo "✓ $key saved"
docker compose up -d >/dev/null 2>&1 && echo "✓ services updated"
