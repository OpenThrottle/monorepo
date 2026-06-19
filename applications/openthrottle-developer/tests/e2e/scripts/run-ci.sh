#!/usr/bin/env sh
# One-command E2E runner for CI (and local prod-parity checks): build the app,
# serve it in PRODUCTION mode, seed the test user, wait for it to listen, then run
# Maestro scoped by tag. Cleans up the server on exit.
#
# Assumes the backend is already reachable: Postgres (:6010), Redis (:6011), and
# openthrottle-server (:6021). Bring those up first (see tests/e2e/README.md):
#   pnpm run database:start && pnpm run database:migrate
#   pnpm nx run openthrottle-server:dev   # or a built server
#
# Usage (from anywhere):
#   sh applications/openthrottle-developer/tests/e2e/scripts/run-ci.sh [tag]
# Args/env:
#   $1 / E2E_TAG   Maestro tag to run (default: smoke). Use "full" for the whole suite.
#   E2E_PORT       port to serve the app on (default: 6020)
#   API_URL_INTERNAL  GraphQL API base (default: http://localhost:6021)
# Prereq: Maestro CLI on PATH (https://docs.maestro.dev), Node/pnpm as usual.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
E2E_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
APP_DIR=$(cd "$E2E_DIR/../.." && pwd)

E2E_TAG="${1:-${E2E_TAG:-smoke}}"
E2E_PORT="${E2E_PORT:-6020}"
API_URL_INTERNAL="${API_URL_INTERNAL:-http://localhost:6021}"
APP_URL="http://localhost:${E2E_PORT}"

echo "▶ Building openthrottle-developer (production)…"
( cd "$APP_DIR" && NODE_ENV=production npx react-router build )

echo "▶ Serving on ${APP_URL} (production)…"
# react-router-serve does not auto-load env; source .env.default for APP_ENV etc.
SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(
  cd "$APP_DIR"
  set -a; . ./.env.default; set +a
  PORT="$E2E_PORT" NODE_ENV=production APP_URL="$APP_URL" \
    API_URL_INTERNAL="$API_URL_INTERNAL" API_URL_EXTERNAL="$API_URL_INTERNAL" \
    npx react-router-serve ./build/server/index.js
) &
SERVER_PID=$!

echo "▶ Waiting for ${APP_URL} …"
i=0
until curl -sS -m 3 -o /dev/null "${APP_URL}/auth"; do
  i=$((i + 1))
  [ "$i" -gt 60 ] && { echo "ERROR: app did not start on ${E2E_PORT}" >&2; exit 1; }
  sleep 2
done

echo "▶ Seeding E2E user…"
E2E_GRAPHQL_URL="${API_URL_INTERNAL}/graphql" sh "$SCRIPT_DIR/seed-user.sh"

echo "▶ Running Maestro (tag: ${E2E_TAG})…"
cd "$E2E_DIR"
find flows -name '*.yaml' -type f | sort -u | xargs maestro test --config config.yaml --include-tags "$E2E_TAG"
echo "✓ E2E (${E2E_TAG}) passed."
