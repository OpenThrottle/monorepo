#!/usr/bin/env bash
#
# Verifies a restored OpenThrottle database. Provider-agnostic: point it at any
# target with POSTGRES_HOST / POSTGRES_PORT / POSTGRES_USER / POSTGRES_PASSWORD /
# POSTGRES_DB, so the same checks cover a Hetzner box, a GCP Cloud SQL instance,
# a local container, or a scratch database in a restore drill.
#
# A row count alone does NOT prove a good restore — pgvector columns can arrive
# as the right number of rows with unusable embeddings. So this checks four
# things a count cannot:
#
#   1. `vector` and `pg_trgm` extensions are actually installed and usable.
#      A managed Postgres and a self-hosted pgvector image fail differently
#      here, so this is checked rather than assumed.
#   2. The `schema_migrations` ledger came across, so `pnpm run database:migrate`
#      is a no-op instead of re-stamping.
#   3. Per-table row counts, for comparison against the source.
#   4. Embeddings are non-null AND answer a real nearest-neighbour query — the
#      operation semantic_search depends on.
#
# Usage:
#   POSTGRES_HOST=... POSTGRES_PORT=... POSTGRES_USER=... \
#   POSTGRES_PASSWORD=... POSTGRES_DB=... databases/verify-restore.sh
#
#   # Capture a baseline from the source, then diff against the target:
#   ... databases/verify-restore.sh --counts-only > /tmp/source-counts.txt
#   ... databases/verify-restore.sh --counts-only > /tmp/target-counts.txt
#   diff /tmp/source-counts.txt /tmp/target-counts.txt

set -euo pipefail

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${POSTGRES_PORT:?POSTGRES_PORT is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

COUNTS_ONLY=0
[[ "${1:-}" == "--counts-only" ]] && COUNTS_ONLY=1

export PGPASSWORD="${POSTGRES_PASSWORD}"
psql_q() {
  psql --no-align --quiet --tuples-only \
    --host "${POSTGRES_HOST}" --port "${POSTGRES_PORT}" \
    --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
    --command "$1"
}

status=0
fail() {
  echo "  FAIL: $*"
  status=1
}

################################################################################
# Per-table row counts (also the --counts-only mode, for source/target diffing)
#
# Ordered by table name so two runs are diffable, and counted with a real
# COUNT(*) rather than reltuples — pg_class estimates are stale straight after a
# restore and would silently "match" nothing.
################################################################################
counts() {
  # Dynamic COUNT(*) per table, built from the catalog.
  local tables
  tables="$(psql_q "
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;")"

  local t cnt
  while IFS= read -r t; do
    [[ -z "${t}" ]] && continue
    cnt="$(psql_q "SELECT count(*) FROM public.\"${t}\";")"
    printf '%s=%s\n' "${t}" "${cnt}"
  done <<< "${tables}"
}

if [[ "${COUNTS_ONLY}" -eq 1 ]]; then
  counts
  exit 0
fi

echo "verifying ${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

################################################################################
# 1. Connectivity + server version
################################################################################
echo "== connectivity =="
server_version="$(psql_q "SHOW server_version;" | tr -d ' ')"
echo "  server_version=${server_version}"
case "${server_version}" in
  18*) echo "  ok: Postgres 18" ;;
  *) echo "  WARNING: expected Postgres 18, got ${server_version}. The data directory layout differs between 17 and 18 (/var/lib/postgresql vs /var/lib/postgresql/data)." ;;
esac

################################################################################
# 2. Extensions — checked as USABLE, not merely present
#
# `CREATE EXTENSION` succeeding is not the same as the extension working:
# pgvector needs a loadable vector.so matching the server build. So each
# extension is exercised, not just looked up in pg_extension.
################################################################################
echo "== extensions =="
for ext in vector pg_trgm; do
  installed="$(psql_q "SELECT count(*) FROM pg_extension WHERE extname = '${ext}';")"
  if [[ "${installed}" != "1" ]]; then
    fail "extension '${ext}' is NOT installed. Migrations create it; if this is empty the migrations container never ran successfully."
    continue
  fi
  echo "  ok: ${ext} installed (v$(psql_q "SELECT extversion FROM pg_extension WHERE extname='${ext}';"))"
done

if [[ "$(psql_q "SELECT count(*) FROM pg_extension WHERE extname='vector';")" == "1" ]]; then
  if psql_q "SELECT '[1,2,3]'::vector <-> '[3,2,1]'::vector;" >/dev/null 2>&1; then
    echo "  ok: vector distance operator works"
  else
    fail "vector extension is installed but its distance operator does not work (vector.so mismatch?)"
  fi
fi

if [[ "$(psql_q "SELECT count(*) FROM pg_extension WHERE extname='pg_trgm';")" == "1" ]]; then
  if psql_q "SELECT similarity('openthrottle', 'openthrotle');" >/dev/null 2>&1; then
    echo "  ok: pg_trgm similarity() works"
  else
    fail "pg_trgm is installed but similarity() does not work"
  fi
fi

################################################################################
# 3. Migration ledger
#
# ⚠️ The ledger only governs `pnpm run database:migrate`
# (scripts/openthrottle-database-migrations.ts). The CONTAINERIZED runner baked
# into Dockerfile.Migrations — the one that actually runs on a deployed box — is
# databases/run-migrations.mjs, which has NO ledger and re-applies every
# migration on every deploy. See databases/SEEDING.md.
################################################################################
echo "== migration ledger =="
has_ledger="$(psql_q "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='schema_migrations';")"
if [[ "${has_ledger}" != "1" ]]; then
  fail "schema_migrations table is missing. A dump from a ledger-tracked database should carry it; without it 'database:migrate' will re-stamp every migration."
else
  applied="$(psql_q "SELECT count(*) FROM schema_migrations;")"
  on_disk="$(find "$(dirname "${BASH_SOURCE[0]}")/migrations" -name '*.sql' | wc -l | tr -d ' ')"
  echo "  applied=${applied} on_disk=${on_disk}"
  if [[ "${applied}" -lt "${on_disk}" ]]; then
    echo "  NOTE: ${on_disk} migration files on disk but only ${applied} recorded — 'database:migrate' will apply the difference. Expected when the dump predates newer migrations."
  else
    echo "  ok: ledger is at or ahead of the files on disk; database:migrate will be a no-op"
  fi
fi

################################################################################
# 4. Embeddings — the fragile part
#
# A row count proves nothing here: the rows can restore with NULL or truncated
# embeddings and every count still matches. So check that embeddings are
# non-null AND that a nearest-neighbour ordering actually executes, which is the
# operation semantic_search performs.
################################################################################
echo "== embeddings =="
embedding_cols="$(psql_q "
  SELECT format('%s.%s', table_name, column_name)
  FROM information_schema.columns
  WHERE table_schema = 'public' AND udt_name = 'vector'
  ORDER BY table_name, column_name;")"

if [[ -z "${embedding_cols}" ]]; then
  echo "  no vector columns found (nothing ingested yet — run database:import-docs)"
else
  while IFS= read -r col; do
    [[ -z "${col}" ]] && continue
    tbl="${col%%.*}"
    c="${col##*.}"
    total="$(psql_q "SELECT count(*) FROM public.\"${tbl}\";")"
    nonnull="$(psql_q "SELECT count(*) FROM public.\"${tbl}\" WHERE \"${c}\" IS NOT NULL;")"
    echo "  ${col}: ${nonnull}/${total} non-null"
    if [[ "${total}" -gt 0 && "${nonnull}" -eq 0 ]]; then
      fail "${col} has ${total} rows but ZERO non-null embeddings — the restore dropped the vector data. Row counts alone would have looked correct."
    fi
    if [[ "${nonnull}" -gt 0 ]]; then
      dim="$(psql_q "SELECT vector_dims(\"${c}\") FROM public.\"${tbl}\" WHERE \"${c}\" IS NOT NULL LIMIT 1;")"
      echo "    dims=${dim}"
      # The actual nearest-neighbour operation semantic_search relies on.
      if psql_q "SELECT 1 FROM public.\"${tbl}\" WHERE \"${c}\" IS NOT NULL ORDER BY \"${c}\" <-> (SELECT \"${c}\" FROM public.\"${tbl}\" WHERE \"${c}\" IS NOT NULL LIMIT 1) LIMIT 1;" >/dev/null 2>&1; then
        echo "    ok: nearest-neighbour query executes"
      else
        fail "${col} cannot be queried with <-> — semantic_search will fail"
      fi
    fi
  done <<< "${embedding_cols}"
fi

################################################################################
# 5. Row counts
################################################################################
echo "== row counts =="
counts | sed 's/^/  /'

echo
if [[ "${status}" -eq 0 ]]; then
  echo "verify-restore: OK"
else
  echo "verify-restore: FAILED"
fi
exit "${status}"
