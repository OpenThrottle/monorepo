#!/usr/bin/env bash

# Verifies local prerequisites for OpenThrottle MCP (@openthrottle/openthrottle-mcp):
# openthrottle-server reachable, embedding config hint, optional auth token.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${API_URL_INTERNAL:-http://localhost:6021}"
BASE="${BASE%/}"

echo "OpenThrottle MCP verification — environment check"
echo "  API_URL_INTERNAL (effective): ${BASE}"
echo ""

if ! curl -sf --max-time 5 "${BASE}/health" > /dev/null; then
  echo "FAIL: openthrottle-server not reachable at ${BASE}/health"
  echo "      Start the API (e.g. pnpm nx run openthrottle-server:dev) and ensure PORT matches this URL."
  exit 1
fi

echo "OK: GET ${BASE}/health"

has_embedding_config() {
  local file="$1"
  [ -f "$file" ] || return 1
  grep -qE '^OPENAI_API_KEY=.+' "$file" 2>/dev/null && return 0
  grep -qE '^OLLAMA_BASE_URL=.+' "$file" 2>/dev/null && return 0
  return 1
}

SERVER_ENV="${ROOT}/applications/openthrottle-server/.env"
if has_embedding_config .env || has_embedding_config "${SERVER_ENV}"; then
  echo "OK: embedding provider configured (OPENAI_API_KEY or OLLAMA_BASE_URL in root .env and/or server .env)"
else
  echo "WARN: no OPENAI_API_KEY or OLLAMA_BASE_URL in root .env or applications/openthrottle-server/.env"
  echo "      MCP starts without a launcher key; semantic_search needs server-side embeddings — see docs/openthrottle/run-locally-oss.md"
fi

if [ -n "${OPENTHROTTLE_MCP_AUTH_TOKEN:-}" ]; then
  echo "OK: OPENTHROTTLE_MCP_AUTH_TOKEN is set in the environment"
  GRAPHQL_URL="${BASE}/graphql"
  AUTH_BODY='{"query":"query { listSources { sources { name } } }"}'
  HTTP_CODE="$(curl -s -o /tmp/ot-mcp-auth-smoke.json -w "%{http_code}" --max-time 10 \
    -X POST "${GRAPHQL_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${OPENTHROTTLE_MCP_AUTH_TOKEN}" \
    -d "${AUTH_BODY}" || true)"
  if [ "${HTTP_CODE}" = "200" ] && grep -q '"listSources"' /tmp/ot-mcp-auth-smoke.json 2>/dev/null; then
    echo "OK: authenticated GraphQL listSources (with ot_sa token)"
  elif [ "${HTTP_CODE}" = "401" ] || [ "${HTTP_CODE}" = "403" ]; then
    echo "FAIL: authenticated GraphQL returned HTTP ${HTTP_CODE} — token revoked, wrong server, or missing plans:* role"
    echo "      Response: $(head -c 200 /tmp/ot-mcp-auth-smoke.json 2>/dev/null || echo '(empty)')"
    exit 1
  else
    echo "WARN: authenticated GraphQL smoke inconclusive (HTTP ${HTTP_CODE}) — check server logs and AUTH.md"
  fi
else
  echo "WARN: OPENTHROTTLE_MCP_AUTH_TOKEN unset — authenticated MCP tools will fail until set."
  echo "      See packages/openthrottle-mcp/docs/AUTH.md"
fi

echo ""
echo "Done."
