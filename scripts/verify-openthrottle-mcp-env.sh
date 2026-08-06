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
  # The server answers auth failures with HTTP 200 + an "errors" array (data:null), and the
  # error's "path":["listSources"] makes a naive grep for "listSources" false-pass. Decide
  # on the body: any "errors" ⇒ rejected; otherwise a real "sources" payload ⇒ OK.
  if grep -q '"errors"' /tmp/ot-mcp-auth-smoke.json 2>/dev/null; then
    echo "FAIL: authenticated GraphQL rejected the token — revoked, wrong server, or missing plans:* role"
    echo "      Response: $(head -c 200 /tmp/ot-mcp-auth-smoke.json 2>/dev/null || echo '(empty)')"
    exit 1
  elif [ "${HTTP_CODE}" = "200" ] && grep -q '"sources"' /tmp/ot-mcp-auth-smoke.json 2>/dev/null; then
    echo "OK: authenticated GraphQL listSources (with ot_sa token)"
  elif [ "${HTTP_CODE}" = "401" ] || [ "${HTTP_CODE}" = "403" ]; then
    echo "FAIL: authenticated GraphQL returned HTTP ${HTTP_CODE} — token revoked, wrong server, or missing plans:* role"
    echo "      Response: $(head -c 200 /tmp/ot-mcp-auth-smoke.json 2>/dev/null || echo '(empty)')"
    exit 1
  else
    echo "WARN: authenticated GraphQL smoke inconclusive (HTTP ${HTTP_CODE}) — check server logs and AUTH.md"
  fi
else
  echo "FAIL: OPENTHROTTLE_MCP_AUTH_TOKEN is unset — every authenticated MCP tool will 401."
  echo "      This is the silent-401 trap. Fix it, then reconnect the MCP:"
  echo "        1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts"
  echo "                                        (Docker: docker compose run --rm bootstrap)"
  echo "        2. Set it in the root .env:      OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>"
  echo "        3. Reconnect the MCP:            /mcp reconnect  (or restart the client)"
  echo "      HTTP-transport, per-request-JWT-only deployments can skip this with"
  echo "      OT_MCP_ALLOW_NO_TOKEN=1. See packages/openthrottle-mcp/docs/AUTH.md."
  [ "${OT_MCP_ALLOW_NO_TOKEN:-}" = "1" ] || exit 1
fi

#############################################################################
# HTTP transport (Docker-native) — probe the streamable-HTTP `mcp` endpoint.
# Opt-in path: the mcp container may not be running (stdio/hybrid setups), so a
# missing endpoint is INFO, not FAIL. Honors a worktree's OPENTHROTTLE_MCP_PORT.
#############################################################################
MCP_HTTP_URL="${OT_MCP_HTTP_URL:-http://localhost:${OPENTHROTTLE_MCP_PORT:-6026}/mcp}"
echo ""
echo "HTTP transport probe → ${MCP_HTTP_URL}"
MCP_TOOLS_BODY='{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
MCP_CODE="$(curl -s -o /tmp/ot-mcp-http-smoke.json -w "%{http_code}" --max-time 5 \
  -X POST "${MCP_HTTP_URL}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "${MCP_TOOLS_BODY}" 2>/dev/null || true)"
if [ "${MCP_CODE}" = "200" ] && grep -q '"tools"' /tmp/ot-mcp-http-smoke.json 2>/dev/null; then
  TOOL_COUNT="$(grep -o '"name"' /tmp/ot-mcp-http-smoke.json 2>/dev/null | wc -l | tr -d ' ')"
  echo "OK: streamable-HTTP MCP reachable (tools/list → ~${TOOL_COUNT} tools)"
  echo "    Register: { \"type\": \"http\", \"url\": \"${MCP_HTTP_URL}\" }"
  echo "    agent_conversation_* tools additionally need a per-request Authorization: Bearer <human JWT>."
else
  echo "INFO: no streamable-HTTP MCP at ${MCP_HTTP_URL} (HTTP ${MCP_CODE:-none})."
  echo "      Fully-Dockerized: bring it up with 'docker compose --profile prod up mcp'."
  echo "      Hybrid/stdio: expected — you're using scripts/run-openthrottle-mcp.sh instead."
  echo "      Worktree: set OPENTHROTTLE_MCP_PORT to this worktree's base+6 (see 'pnpm run worktree:new')."
fi
rm -f /tmp/ot-mcp-http-smoke.json 2>/dev/null || true

echo ""
echo "Done."
