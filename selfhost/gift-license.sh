#!/usr/bin/env bash
# Free (gift) licenses — no payment, no Stripe.
#   ./gift-license.sh add friend@example.com [product-slug]   create a free license
#   ./gift-license.sh list                                    show all gift licenses
#   ./gift-license.sh revoke DPS-XXXX-XXXX-XXXX               turn a license off
# The friend signs in to the planner with that same email and is licensed
# automatically; the key also works on the planner's activation page.
set -euo pipefail
cd "$(dirname "$0")"

psql() { docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -qAt "$@"; }

new_key() {
  local a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789" s="" i b
  for i in $(seq 1 12); do
    b=$(od -An -N1 -tu1 /dev/urandom | tr -d ' ')
    s+="${a:$((b % 32)):1}"
  done
  echo "DPS-${s:0:4}-${s:4:4}-${s:8:4}"
}

case "${1:-}" in
  add)
    email=$(echo "${2:?usage: $0 add EMAIL [product-slug]}" | tr '[:upper:]' '[:lower:]' | xargs)
    [[ "$email" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || { echo "Invalid email: $email" >&2; exit 1; }
    slug="${3:-}"
    key=$(new_key)
    psql -v email="$email" -v slug="$slug" -v key="$key" <<'SQL' >/dev/null
begin;
with p as (
  select id, store_id, max_activations from products
  where is_active and (:'slug' = '' or slug = :'slug')
  order by created_at limit 1
), c as (
  insert into customers (store_id, email)
  select store_id, :'email' from p
  on conflict (store_id, email) do update set email = excluded.email
  returning id, store_id
), o as (
  insert into orders (store_id, customer_id, amount_satang, status, paid_at)
  select c.store_id, c.id, 0, 'paid', now() from c
  returning id
), i as (
  insert into order_items (order_id, product_id, price_satang)
  select o.id, p.id, 0 from o, p
  returning id
)
insert into licenses (order_item_id, key, max_activations)
select i.id, :'key', p.max_activations from i, p;
commit;
SQL
    if [ "$(psql -c "select count(*) from licenses where key='$key'")" != "1" ]; then
      echo "No license created — check the product slug." >&2; exit 1
    fi
    echo "Gift license for $email:"
    echo "  $key"
    echo "Sign in at the planner with $email (activates automatically), or enter the key."
    ;;
  list)
    psql -F' | ' -c "
      select l.key, c.email, l.status, o.created_at::date
      from licenses l join order_items i on i.id=l.order_item_id
      join orders o on o.id=i.order_id join customers c on c.id=o.customer_id
      where o.amount_satang = 0 order by o.created_at desc;"
    ;;
  revoke)
    key="${2:?usage: $0 revoke KEY}"
    [[ "$key" =~ ^DPS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$ ]] || { echo "Invalid key" >&2; exit 1; }
    n=$(psql -c "update licenses set status='revoked', revoked_at=now() where key='$key' and status='active' returning 1" | grep -c 1 || true)
    psql -c "update planner_profiles set license_key=null, licensed_at=null where license_key='$key'" >/dev/null
    [ "$n" = "1" ] && echo "Revoked $key" || echo "Not found or already revoked: $key"
    ;;
  *)
    sed -n '2,8p' "$0"; exit 1 ;;
esac
