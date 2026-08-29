#!/usr/bin/env sh
# Assert every episode's declared dataRequirements against the DEMO database,
# without re-seeding. `seed-demo.sh` already runs the same check at the end;
# this wrapper exists so the check can be re-run on its own after poking at the
# data, and so the Nx target has something to call.
#
# Resolves the demo connection exactly the way seed-demo.sh does, because
# exporting POSTGRES_DB is silently ignored — see resolve-demo-url.ts.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DEMO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
ROOT_DIR=$(cd "$DEMO_DIR/../../.." && pwd)

DEMO_POSTGRES_DB="${DEMO_POSTGRES_DB:-openthrottle_demo}"

cd "$ROOT_DIR"

DEMO_URL=$(
  DEMO_POSTGRES_DB="$DEMO_POSTGRES_DB" POSTGRES_HOST="${POSTGRES_HOST:-localhost}" \
    pnpm exec tsx --env-file .env "$SCRIPT_DIR/resolve-demo-url.ts" | tail -1
)
export OPENTHROTTLE_POSTGRES_URL="$DEMO_URL"
export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"

pnpm exec tsx --env-file .env "$SCRIPT_DIR/verify-demo-data.ts"
