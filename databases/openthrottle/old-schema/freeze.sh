#!/usr/bin/env bash
# Freeze the openthrottle database at migration <N>, ledger included.
#
#   bash databases/openthrottle/old-schema/freeze.sh <N>
#
# Writes databases/openthrottle/old-schema/old-schema.sql: what the openthrottle
# database looks like on an install whose migrations image last ran with
# migration <N> as its newest file. The server image's boot check
# (.github/actions/docker-build-push/boot-check.sh) restores it, runs today's
# migrations image over it and requires the server to come up healthy.
#
# The dump is produced by the REAL runner — today's Dockerfile.Migrations image
# (databases/migrate.ts + migration-runner.ts) with its openthrottle migrations
# directory swapped for the files numbered <= <N> — so it carries the
# schema_migrations ledger exactly as a deployed box does. Restored, the runner
# sees a populated ledger and applies only the files after <N>: the steady-state
# upgrade path every box deployed since the ledger (#645) takes, and one a
# fresh-database boot never exercises. A migration that assumes state a fresh
# database happens to have, but an old one does not, fails there.
#
# Only openthrottle is frozen. The cms database did not exist at the frozen <N>
# (it arrived in #722), so on restore the migrations image creates and migrates
# it from scratch — again exactly what an upgrading box does. Freeze cms too once
# a <N> postdates it.
#
# Frozen, not regenerated per run: the point is a database that is genuinely OLD
# relative to the code under test. Re-freeze deliberately (a newer <N>) only when
# the gap is large enough that the fixture stops resembling a real install; the
# diff of this file is then the schema delta being signed off. Never edit the
# dump by hand.
#
# Docker only: Postgres is the pinned pgvector image (the same tag as the boot
# check and the Hetzner compose template). Run from anywhere in the repository.
set -euo pipefail

LAST="${1:?usage: freeze.sh <last-migration-number>}"
[[ "${LAST}" =~ ^[0-9]+$ ]] || {
  echo "freeze.sh: <N> must be a migration number, got '${LAST}'" >&2
  exit 2
}
LAST=$((10#${LAST}))

POSTGRES_IMAGE="pgvector/pgvector:0.8.2-pg18-trixie"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT="${ROOT}/databases/openthrottle/old-schema/old-schema.sql"

RUN_ID="freeze-$$"
NETWORK="${RUN_ID}-net"
POSTGRES="${RUN_ID}-postgres"
MIGRATIONS_IMAGE="${RUN_ID}-migrations"
STAGE="$(mktemp -d)"

cleanup() {
  docker rm -f "${POSTGRES}" > /dev/null 2>&1 || true
  docker network rm "${NETWORK}" > /dev/null 2>&1 || true
  docker rmi "${MIGRATIONS_IMAGE}" > /dev/null 2>&1 || true
  rm -rf "${STAGE}"
}
trap cleanup EXIT

# Stage the migration set as it stood at <N>. World-readable: the migrations
# image runs as a non-root user.
mkdir -p "${STAGE}/openthrottle" "${STAGE}/cms"
staged=0
for file in "${ROOT}"/databases/openthrottle/migrations/*.sql; do
  name="$(basename "${file}")"
  number=$((10#${name%%_*}))
  ((number <= LAST)) || continue
  cp "${file}" "${STAGE}/openthrottle/"
  staged=$((staged + 1))
done
((staged > 0)) || {
  echo "freeze.sh: no openthrottle migrations numbered <= ${LAST}" >&2
  exit 1
}
chmod -R a+rX "${STAGE}"

POSTGRES_ENV=(
  -e POSTGRES_DB=openthrottle
  -e POSTGRES_HOST=postgres
  -e POSTGRES_PASSWORD=freeze
  -e POSTGRES_PORT=5432
  -e POSTGRES_USER=openthrottle
)

docker network create "${NETWORK}" > /dev/null
docker run -d --name "${POSTGRES}" --network "${NETWORK}" --network-alias postgres \
  "${POSTGRES_ENV[@]}" "${POSTGRES_IMAGE}" > /dev/null
until docker exec "${POSTGRES}" pg_isready -U openthrottle -d openthrottle > /dev/null 2>&1; do
  sleep 1
done

docker build -q -f "${ROOT}/Dockerfile.Migrations" -t "${MIGRATIONS_IMAGE}" "${ROOT}" > /dev/null
# An empty cms directory: the runner creates the cms database and an empty
# ledger, neither of which is dumped. Only the openthrottle database is frozen.
docker run --rm --network "${NETWORK}" "${POSTGRES_ENV[@]}" \
  --volume "${STAGE}/openthrottle:/app/databases/openthrottle/migrations:ro" \
  --volume "${STAGE}/cms:/app/databases/cms/migrations:ro" \
  "${MIGRATIONS_IMAGE}" | tail -1

# A fixed --restrict-key keeps the dump byte-stable across re-freezes (pg_dump
# 18 otherwise writes a random key into its \restrict guard lines).
{
  echo "-- GENERATED — DO NOT EDIT. Regenerate: bash databases/openthrottle/old-schema/freeze.sh ${LAST}"
  echo "-- openthrottle database after migration ${LAST} (${staged} files), schema_migrations ledger included."
  echo
  docker exec "${POSTGRES}" pg_dump --username=openthrottle --dbname=openthrottle \
    --no-owner --no-privileges --restrict-key=openthrottleoldschema
} > "${OUT}"

ledger="$(grep -c '' <(docker exec "${POSTGRES}" psql -U openthrottle -d openthrottle -Atc 'SELECT filename FROM schema_migrations'))"
echo "froze ${staged} migrations (<= ${LAST}, ${ledger} ledger rows) into ${OUT#"${ROOT}"/}"
