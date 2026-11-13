#!/usr/bin/env bash
#
# Applies every migration to an EMPTY Postgres, then runs each dev seed twice and
# fails unless:
#   - both runs exit 0 (the seed still matches the schema the migrations build),
#   - the second run changes no row in any table (the seed is idempotent), and
#   - the cms seed's `welcome` layout resolves by slug to its ordered child tree, every seeded
#     fragment sits on a generated ACTIVE schema, and the LayoutGrid holds its three cards.
#
# Why this exists: the seeds are plain SQL, so nothing type-checks them against
# the migrations. A migration that renames or drops a column a seed writes would
# otherwise only surface when someone next ran `database:seed:*` by hand.
#
# Used by the `database-seeds` job in .github/workflows/continuous-integration.yml.
# Run it locally against a THROWAWAY container, never a database you care about:
#
#   docker run -d --name seed-check -e POSTGRES_USER=ci -e POSTGRES_PASSWORD=ci \
#     -e POSTGRES_DB=openthrottle -p 7399:5432 pgvector/pgvector:0.8.2-pg18-trixie
#   PG_CONTAINER=seed-check POSTGRES_USER=ci POSTGRES_PASSWORD=ci \
#     POSTGRES_DB=openthrottle POSTGRES_PORT=7399 scripts/check-database-seeds.sh
#   docker rm -f seed-check
#
# Inputs (environment): PG_CONTAINER, the docker container running Postgres (psql
# runs inside it, so the host needs no client), plus the POSTGRES_* variables the
# migration runner and seeds already read.

set -euo pipefail

: "${PG_CONTAINER:?PG_CONTAINER must name the container running Postgres}"
: "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}" "${POSTGRES_DB:?}" "${POSTGRES_PORT:?}"

cd "$(git rev-parse --show-toplevel)"

# The database:* scripts pass `tsx --env-file .env`, which fails when the file is
# missing (a CI checkout has none). Exported variables win over the file anyway.
[ -f .env ] || : >.env

CMS_DB="${CMS_POSTGRES_DB:-cms}"

# Pin every URL the runner and seeds would prefer over POSTGRES_* to the database
# this script was pointed at. Exported values beat the .env file, so a developer's
# .env can never redirect a local run at a real database.
base_url="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}"
export OPENTHROTTLE_POSTGRES_URL="${base_url}/${POSTGRES_DB}"
export POSTGRES_URL="${base_url}/${POSTGRES_DB}"
export CMS_POSTGRES_URL="${base_url}/${CMS_DB}"

run_psql() {
  local database="$1"
  shift
  docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -qAt -U "$POSTGRES_USER" -d "$database" "$@"
}

# One md5 over every row of every public table: any change a seed makes to any
# table, including ones it was never meant to touch, changes the digest.
snapshot() {
  local database="$1" union
  union="$(run_psql "$database" -c "
    SELECT string_agg(format('SELECT %L || row_to_json(t)::text AS r FROM public.%I t', tablename, tablename), ' UNION ALL ')
    FROM pg_tables WHERE schemaname = 'public'")"
  run_psql "$database" -c "SELECT md5(coalesce(string_agg(r, E'\n' ORDER BY r), '')) FROM (${union}) rows"
}

seed_all() {
  pnpm run database:seed:blog
  pnpm run database:seed:cms
}

echo "▶ applying every migration to the empty database"
pnpm run database:migrate

echo "▶ first seed run"
seed_all
before_primary="$(snapshot "$POSTGRES_DB")"
before_cms="$(snapshot "$CMS_DB")"

echo "▶ second seed run (must change nothing)"
seed_all
after_primary="$(snapshot "$POSTGRES_DB")"
after_cms="$(snapshot "$CMS_DB")"

failed=0

if [ "$before_primary" != "$after_primary" ]; then
  echo "❌ re-running the seeds changed rows in ${POSTGRES_DB} ($before_primary → $after_primary)"
  failed=1
fi

if [ "$before_cms" != "$after_cms" ]; then
  echo "❌ re-running the seeds changed rows in ${CMS_DB} ($before_cms → $after_cms)"
  failed=1
fi

welcome="$(run_psql "$CMS_DB" -c "
  SELECT l.status || '|' || f.typename || '|' || coalesce((
    SELECT string_agg(c.typename, ',' ORDER BY fc.sort_order)
    FROM fragments_children fc JOIN fragments c ON c.uuid = fc.children_uuid
    WHERE fc.fragment_uuid = f.uuid), '')
  FROM layouts l JOIN fragments f ON f.uuid = l.fragment_uuid
  WHERE l.slug = 'welcome'")"
expected='ACTIVE|Layout|Heading,Wysiwyg,Button,LayoutGrid'

if [ "$welcome" != "$expected" ]; then
  echo "❌ layout 'welcome' resolved to '${welcome}', expected '${expected}'"
  failed=1
fi

# The seed pins every fragment to its typename's generated ACTIVE schema (synced first), and the
# grid is a real container: a LayoutGrid schema with a children property, holding three cards.
off_active="$(run_psql "$CMS_DB" -c "
  SELECT count(*) FROM fragments f JOIN schemas s ON s.uuid = f.schema_uuid
  WHERE f.uuid::text LIKE '5eed0000-%' AND s.status IS DISTINCT FROM 'ACTIVE'")"
grid="$(run_psql "$CMS_DB" -c "
  SELECT (s.json_schema->'properties' ? 'children')::text || '|' || (
    SELECT string_agg(c.typename, ',' ORDER BY fc.sort_order)
    FROM fragments_children fc JOIN fragments c ON c.uuid = fc.children_uuid
    WHERE fc.fragment_uuid = f.uuid)
  FROM fragments f JOIN schemas s ON s.uuid = f.schema_uuid
  WHERE f.uuid = '5eed0000-0000-4000-8000-000000000205'")"

if [ "$off_active" != '0' ]; then
  echo "❌ ${off_active} seeded fragment(s) are not on an ACTIVE schema"
  failed=1
fi

if [ "$grid" != 'true|Card,Card,Card' ]; then
  echo "❌ the seeded LayoutGrid resolved to '${grid}', expected 'true|Card,Card,Card'"
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "✅ migrations + seeds: both runs succeeded, the second changed nothing, 'welcome' resolves"
