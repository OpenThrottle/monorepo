#!/usr/bin/env bash
#
# Docker smoke-test matrix for the OpenThrottle compose stacks.
# Backs OT plan ba18d88d-0a65-47c5-8b90-adc83d3f4ca7 (Docker dev workflow).
#
# Modes (pick one, default `prod`):
#   prod      — production parity: docker compose up --build (root), assert
#               server /health 200 + developer / 200 (after auth redirect).
#   dev       — dev profile: docker compose --profile dev watch (root), assert
#               server /health 200 + developer / 200 (after auth redirect)
#               against the dev images.
#   consumer  — consumer install: applications/openthrottle compose from
#               published images, assert first-boot migrate/seed + server health.
#
# Usage:
#   scripts/docker-smoke-test.sh [prod|dev|consumer]
#
# Notes:
#   - Reads ports from the repo-root .env (falls back to the 60xx defaults).
#   - dev mode starts `watch` in the background and tears it down on exit.
#   - This is a thin orchestration wrapper around docker compose; it does not
#     build/publish images.
set -euo pipefail

MODE="${1:-prod}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load ports from .env when present (without exporting the whole file).
get_env() { grep -E "^${1}=" .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"' || true; }
SERVER_PORT="$(get_env OPENTHROTTLE_SERVER_PORT)"; SERVER_PORT="${SERVER_PORT:-6021}"
DEVELOPER_PORT="$(get_env OPENTHROTTLE_DEVELOPER_PORT)"; DEVELOPER_PORT="${DEVELOPER_PORT:-6020}"

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
pass() { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

# Poll an HTTP endpoint until it returns the expected status (or time out).
# Pass `follow` as the 5th arg to follow redirects (curl -L) — the developer
# app 302s unauthenticated visitors from / to /auth, which serves the 200.
wait_http() {
  local url="$1" want="$2" label="$3" tries="${4:-60}" follow="${5:-}"
  log "Waiting for $label ($url → $want)"
  for ((i = 1; i <= tries; i++)); do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 ${follow:+-L} "$url" 2>/dev/null || echo 000)"
    if [[ "$code" == "$want" ]]; then pass "$label healthy ($code) after ~$((i * 5))s"; return 0; fi
    sleep 5
  done
  fail "$label did not reach $want in time"
}

smoke_prod() {
  log "PROD parity — docker compose up --build"
  docker compose --profile prod up --build -d
  wait_http "http://localhost:${SERVER_PORT}/health" 200 "server /health"
  wait_http "http://localhost:${DEVELOPER_PORT}/" 200 "developer /" 60 follow
  pass "Production parity OK"
}

smoke_dev() {
  log "DEV profile — docker compose --profile dev watch (background)"
  docker compose --profile dev watch >/tmp/ot-smoke-dev.log 2>&1 &
  local watch_pid=$!
  # shellcheck disable=SC2064
  trap "kill ${watch_pid} 2>/dev/null || true; docker compose --profile dev down" EXIT
  wait_http "http://localhost:${SERVER_PORT}/health" 200 "server-dev /health" 90
  wait_http "http://localhost:${DEVELOPER_PORT}/" 200 "developer-dev /" 60 follow
  pass "Dev profile OK (edit a resolver/route and re-curl to confirm hot reload)"
}

smoke_consumer() {
  local dir="applications/openthrottle"
  log "CONSUMER install — $dir (published images)"
  [[ -f "$dir/.env" ]] || { cp "$dir/.env.default" "$dir/.env"; log "created $dir/.env from .env.default"; }
  ( cd "$dir" && docker compose up -d )
  # Server depends_on migrations (service_completed_successfully) + healthy db,
  # so a healthy server implies first-boot seed + migrate succeeded.
  wait_http "http://localhost:${SERVER_PORT}/health" 200 "server /health (after migrate/seed)" 90
  wait_http "http://localhost:${DEVELOPER_PORT}/" 200 "developer /" 60 follow
  pass "Consumer install OK"
}

case "$MODE" in
  prod) smoke_prod ;;
  dev) smoke_dev ;;
  consumer) smoke_consumer ;;
  *) fail "Unknown mode '$MODE' (expected: prod | dev | consumer)" ;;
esac
