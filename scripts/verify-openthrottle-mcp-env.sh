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
else
  echo "WARN: MCP_DEVELOPER_AUTH_TOKEN unset — authenticated MCP tools will fail until set."
  echo "      See packages/mcp-developer/docs/AUTH.md"
fi

echo ""
echo "Done."
