#!/usr/bin/env sh
# Seed (idempotently) the deterministic E2E test user used by authenticated
# Maestro flows. Calls the openthrottle-server `register` GraphQL mutation, which
# creates the user and bcrypt-hashes the password. Re-running is safe: the server
# returns "Email already registered" once the user exists, which we treat as success.
#
# Usage (from anywhere; requires the server reachable at E2E_GRAPHQL_URL):
#   sh applications/openthrottle-developer/tests/e2e/scripts/seed-user.sh
#
# The defaults match the credentials the /auth form pre-fills, because the Maestro
# login helper submits the prefilled form rather than typing (Maestro Web cannot
# reliably clear a controlled React input). Keep these in sync with that prefill.
#
# Override credentials/endpoint via env:
#   E2E_USER_EMAIL      default: developer@openthrottle.com
#   E2E_USER_PASSWORD   default: FullThrottle2026!
#   E2E_GRAPHQL_URL     default: http://localhost:6021/graphql  (API_URL_INTERNAL + /graphql)
set -eu

EMAIL="${E2E_USER_EMAIL:-developer@openthrottle.com}"
PASSWORD="${E2E_USER_PASSWORD:-FullThrottle2026!}"
GRAPHQL_URL="${E2E_GRAPHQL_URL:-http://localhost:6021/graphql}"

QUERY='mutation Register($input: RegisterInput!) { register(input: $input) { id email accessToken } }'

# Build the JSON request body. Credentials are simple local test values with no
# quotes/backslashes, so direct interpolation is safe here.
BODY=$(printf '{"query":"%s","variables":{"input":{"email":"%s","password":"%s"}}}' \
  "$QUERY" "$EMAIL" "$PASSWORD")

echo "Seeding E2E user '$EMAIL' via $GRAPHQL_URL ..."

RESPONSE=$(curl -sS -X POST "$GRAPHQL_URL" \
  -H 'Content-Type: application/json' \
  --data "$BODY") || {
  echo "ERROR: could not reach the GraphQL server at $GRAPHQL_URL." >&2
  echo "Start it first: pnpm nx run openthrottle-server:dev" >&2
  exit 1
}

case "$RESPONSE" in
  *'"accessToken"'*)
    echo "OK: E2E user created."
    exit 0
    ;;
  *'Email already registered'*)
    echo "OK: E2E user already exists (idempotent no-op)."
    exit 0
    ;;
  *)
    echo "ERROR: unexpected response from register mutation:" >&2
    echo "$RESPONSE" >&2
    exit 1
    ;;
esac
