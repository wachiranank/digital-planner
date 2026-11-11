#!/usr/bin/env bash
# Put the n8n that is already on this VPS behind this kit's Caddy at https://<domain>.
#
#   ./scripts/n8n-connect.sh n8n.claudecoach.online
#
# What it does (safe to run again):
#   1. finds the n8n container and the docker compose project that started it
#   2. backs up n8n's data volumes and compose files
#   3. adds an override: n8n joins the shared `edge` network as "n8n", no public ports,
#      N8N_HOST / WEBHOOK_URL use the new https domain; a Traefik in the same project is disabled
#      (this kit's Caddy owns ports 80/443)
#   4. restarts n8n and reloads Caddy (sites/n8n.caddy)
set -euo pipefail
DOMAIN="${1:-n8n.claudecoach.online}"
KIT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
say() { printf '\n== %s\n' "$*"; }

say "1/4 find n8n"
C="$(docker ps -a --format '{{.Names}} {{.Image}}' | awk 'tolower($2) ~ /n8n/ {print $1; exit}')"
[ -n "$C" ] || { echo "ไม่พบ container ของ n8n บนเครื่องนี้ — ส่งผล 'docker ps -a' มาให้ Claude ดู"; exit 1; }
label() { docker inspect "$C" --format "{{ index .Config.Labels \"$1\" }}" 2>/dev/null; }
PROJECT="$(label com.docker.compose.project)"
SERVICE="$(label com.docker.compose.service)"
DIR="$(label com.docker.compose.project.working_dir)"
FILES="$(label com.docker.compose.project.config_files)"
[ -n "$PROJECT" ] && [ -n "$DIR" ] && [ -n "$FILES" ] || { echo "n8n ($C) ไม่ได้รันผ่าน docker compose — ส่งผล 'docker inspect $C' มาให้ Claude ดู"; exit 1; }
echo "container=$C  project=$PROJECT  service=$SERVICE  dir=$DIR"
echo "files=$FILES"
TRAEFIK="$(docker ps -a --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Label "com.docker.compose.service"}} {{.Image}}' | awk 'tolower($2) ~ /traefik/ {print $1; exit}')"
[ -n "$TRAEFIK" ] && echo "traefik service in the same project: $TRAEFIK (will be disabled)"

say "2/4 backup -> /root/n8n-backup-$STAMP"
B="/root/n8n-backup-$STAMP"; mkdir -p "$B"
IFS=',' read -ra CF <<<"$FILES"
for f in "${CF[@]}"; do cp -a "$f" "$B/"; done
[ -f "$DIR/.env" ] && cp -a "$DIR/.env" "$B/dot-env"
docker inspect "$C" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{"\n"}}{{end}}{{end}}' | while read -r v; do
  [ -n "$v" ] || continue
  docker run --rm -v "$v":/d:ro -v "$B":/b alpine tar czf "/b/volume-$v.tgz" -C /d .
  echo "volume $v -> $B/volume-$v.tgz"
done

say "3/4 override"
docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
OV="$DIR/n8n-behind-caddy.override.yml"
{
  echo "# written by digital-suite selfhost/scripts/n8n-connect.sh — n8n behind Caddy at https://$DOMAIN"
  echo "services:"
  echo "  $SERVICE:"
  echo "    ports: !reset []"
  echo "    environment:"
  echo "      N8N_HOST: \"$DOMAIN\""
  echo "      N8N_PROTOCOL: \"https\""
  echo "      N8N_PORT: \"5678\""
  echo "      N8N_EDITOR_BASE_URL: \"https://$DOMAIN/\""
  echo "      WEBHOOK_URL: \"https://$DOMAIN/\""
  echo "      N8N_PROXY_HOPS: \"1\""
  echo "    networks:"
  echo "      default:"
  echo "      edge:"
  echo "        aliases: [n8n]"
  if [ -n "$TRAEFIK" ]; then
    echo "  $TRAEFIK:"
    echo "    profiles: [\"disabled\"]"
  fi
  echo "networks:"
  echo "  edge:"
  echo "    name: edge"
  echo "    external: true"
} >"$OV"
cat "$OV"

ARGS=(-p "$PROJECT" --project-directory "$DIR")
for f in "${CF[@]}"; do ARGS+=(-f "$f"); done
ARGS+=(-f "$OV")
docker compose "${ARGS[@]}" config -q
[ -n "$TRAEFIK" ] && docker compose "${ARGS[@]}" stop "$TRAEFIK" 2>/dev/null || true
docker compose "${ARGS[@]}" up -d "$SERVICE"

say "4/4 Caddy"
cd "$KIT"
grep -q "^$DOMAIN {" sites/n8n.caddy || { echo "sites/n8n.caddy ยังไม่ใช่ $DOMAIN — แก้บรรทัดโดเมนในไฟล์นั้นก่อน แล้วรันใหม่"; exit 1; }
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
sleep 5
docker ps --filter "name=$C" --format '{{.Names}}: {{.Status}}'
echo "https://$DOMAIN -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://$DOMAIN/" || echo 'no response yet (DNS/certificate may need a minute)')"
echo
echo "เสร็จแล้ว ✓  เปิด https://$DOMAIN"
echo "ย้อนกลับ: ลบ $OV แล้วรัน 'docker compose -p $PROJECT --project-directory $DIR up -d' และลบ sites/n8n.caddy"
echo "ข้อมูลสำรองอยู่ที่ $B"
