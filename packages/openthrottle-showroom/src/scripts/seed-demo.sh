#!/usr/bin/env sh
# Bring up the deterministic demo workspace the screencast pipeline records
# against: create the DEMO database if it does not exist, apply every migration,
# then seed the fictional content.
#
# Usage (from anywhere):
#   sh packages/openthrottle-showroom/src/scripts/seed-demo.sh [--reset]
#
#   --reset   truncate the demo scope before seeding, so take 7 looks like take 1.
#
# Env:
#   DEMO_POSTGRES_DB  demo database name (default: openthrottle_demo). Must contain
#                     'demo' — the seeder refuses to run otherwise, because
#                     --reset truncates.
#   DEMO_NOW          ISO timestamp to anchor the fixture's relative offsets to,
#                     for a byte-reproducible seed. Defaults to now.
#   POSTGRES_*        host/port/user/password, as everywhere else in the repo.
#
# WHY A SEPARATE DATABASE, not a scoped user in the dev database: the task-3
# recording spike captured the real dev dashboard — 834 plans with real internal
# titles, including in-flight work. Row-level scoping does not help, because the
# dashboard's counters, activity chart and search all read across the workspace.
# The only reliable control is a database that contains nothing but fiction. See
# docs/marketing/publish-checklist.md.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DEMO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ROOT_DIR=$(cd "$DEMO_DIR/../../../.." && pwd)

DEMO_POSTGRES_DB="${DEMO_POSTGRES_DB:-openthrottle_demo}"
RESET_ARG=""

for arg in "$@"; do
  case "$arg" in
    --reset) RESET_ARG="--reset" ;;
    *) echo "seed-demo: unknown argument '$arg'" >&2; exit 1 ;;
  esac
done

case "$DEMO_POSTGRES_DB" in
  *demo*) ;;
  *) echo "seed-demo: DEMO_POSTGRES_DB must contain 'demo' (got '$DEMO_POSTGRES_DB')." >&2; exit 1 ;;
esac

cd "$ROOT_DIR"

# Resolve the demo connection URL once and pass it down as
# OPENTHROTTLE_POSTGRES_URL. Exporting POSTGRES_DB is NOT enough: the server's
# .env sets POSTGRES_URL, which beats the POSTGRES_* pieces, so a POSTGRES_DB
# override is silently ignored and the process quietly keeps using the dev
# database. OPENTHROTTLE_POSTGRES_URL wins over both.
DEMO_URL=$(
  DEMO_POSTGRES_DB="$DEMO_POSTGRES_DB" POSTGRES_HOST="${POSTGRES_HOST:-localhost}" \
    pnpm exec tsx --env-file .env "$SCRIPT_DIR/resolve-demo-url.ts" | tail -1
)
export OPENTHROTTLE_POSTGRES_URL="$DEMO_URL"
export POSTGRES_DB="$DEMO_POSTGRES_DB"
export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"

echo "▶ Ensuring database '$DEMO_POSTGRES_DB' exists…"
pnpm exec tsx --env-file .env "$SCRIPT_DIR/ensure-demo-database.ts"

echo "▶ Applying migrations to '$DEMO_POSTGRES_DB'…"
pnpm exec tsx --env-file .env ./scripts/openthrottle-database-migrations.ts

echo "▶ Seeding demo content…"
pnpm exec tsx --env-file .env "$SCRIPT_DIR/seed-demo.ts" $RESET_ARG

echo "✓ Demo workspace ready in '$DEMO_POSTGRES_DB'."
echo "  Point a server at it with the SAME override, not POSTGRES_DB:"
echo "    OPENTHROTTLE_POSTGRES_URL='$DEMO_URL' pnpm nx run openthrottle-server:dev"
