#!/bin/sh
# Applies every /migrations/*.sql exactly once, in name order, each inside a transaction.
set -eu
PSQL="psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create table if not exists public._selfhost_migrations (name text primary key, applied_at timestamptz not null default now());
          alter table public._selfhost_migrations enable row level security;"
for f in /migrations/*.sql; do
  n=$(basename "$f")
  done_already=$($PSQL -tAc "select 1 from public._selfhost_migrations where name = '$n'")
  if [ -z "$done_already" ]; then
    echo "→ applying $n"
    $PSQL -1 -f "$f"
    $PSQL -c "insert into public._selfhost_migrations (name) values ('$n')"
  fi
done
echo "migrations up to date"
