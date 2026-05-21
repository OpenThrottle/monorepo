#!/usr/bin/env bash

# Verifies local prerequisites for OpenThrottle MCP (@openthrottle/mcp-developer):
# openthrottle-server reachable, OPENAI key for run-mcp-developer.sh, optional auth token.
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

if [ -f .env ] && grep -qE '^OPENAI_API_KEY=.+' .env; then
  echo "OK: OPENAI_API_KEY is set in .env (required by scripts/run-mcp-developer.sh)"
else
  echo "WARN: OPENAI_API_KEY missing or empty in .env — scripts/run-mcp-developer.sh will exit until set."
fi

if [ -n "${MCP_DEVELOPER_AUTH_TOKEN:-}" ]; then
  echo "OK: MCP_DEVELOPER_AUTH_TOKEN is set in the environment"
  GRAPHQL_URL="${BASE}/graphql"
  AUTH_BODY='{"query":"query { listSources { sources { name } } }"}'
  HTTP_CODE="$(curl -s -o /tmp/ot-mcp-auth-smoke.json -w "%{http_code}" --max-time 10 \
    -X POST "${GRAPHQL_URL}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${MCP_DEVELOPER_AUTH_TOKEN}" \
    -d "${AUTH_BODY}" || true)"
  if [ "${HTTP_CODE}" = "200" ] && grep -q '"listSources"' /tmp/ot-mcp-auth-smoke.json 2>/dev/null; then
    echo "OK: authenticated GraphQL listSources (APP_ENABLE_AUTHENTICATION + ot_sa token)"
  elif [ "${HTTP_CODE}" = "401" ] || [ "${HTTP_CODE}" = "403" ]; then
    echo "FAIL: authenticated GraphQL returned HTTP ${HTTP_CODE} — token revoked, wrong server, or missing plans:* role"
    echo "      Response: $(head -c 200 /tmp/ot-mcp-auth-smoke.json 2>/dev/null || echo '(empty)')"
    exit 1
  else
    echo "WARN: authenticated GraphQL smoke inconclusive (HTTP ${HTTP_CODE}) — check server logs and AUTH.md"
  fi
else
  echo "WARN: MCP_DEVELOPER_AUTH_TOKEN unset — authenticated MCP tools will fail until set."
  echo "      See packages/mcp-developer/docs/AUTH.md"
fi

echo ""
echo "Done."
