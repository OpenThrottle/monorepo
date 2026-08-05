#!/usr/bin/env bash

# Run openthrottle-mcp MCP server on stdio. Build output is sent to stderr so stdout
# contains only JSON-RPC for the MCP client.
# Sets WORKTREE_ID from git worktree root basename so each worktree advertises a distinct MCP server name.
#
# Resolves API_URL to the first REACHABLE OpenThrottle server, preferring the STABLE
# (main/root checkout) server over this worktree's. MCP CRUD is checkout-agnostic —
# every checkout shares the host Postgres, so plans/tasks reads and writes land in the
# same data no matter which server answers. Server choice is therefore purely a
# liveness/resilience concern: pin to the stable server so restarting a worktree's
# server-under-test never interrupts tooling mid-session. Execution isolation (which
# worker runs a plan) is NOT decided here — that's the per-checkout BullMQ queue prefix
# (OT_QUEUE_PREFIX / OT_CONTAINER_PREFIX in @openthrottle/nestjs-bullmq).
#
# Set OT_MCP_TARGET=worktree to prefer this worktree's server instead (e.g. when
# testing server changes through the MCP itself); the stable server remains the
# fallback when the worktree's is unreachable, and vice versa.
set -e

log() { echo "$@" > /dev/stderr; }

log "🔍 Using Node.js version: $(node -v)"

cd "$(dirname "$0")/.."

# Worktree-aware identity: basename of git root (e.g. monorepo-worktree-one). Unset if not in a git repo.
if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  export WORKTREE_ID=$(basename "$git_root")
else
  unset -v WORKTREE_ID
fi

# --- Resolve a LIVE OpenThrottle server ---------------------------------------------
# Read one var from an env file WITHOUT sourcing it (a missing .env must never abort the
# launcher, and we don't want side effects from a worktree's full env). Strips quotes.
read_env_var() {
  [ -f "$1" ] || return 1
  grep -E "^${2}=" "$1" | tail -n1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"
}

# Build candidate server URLs in priority order (STABLE-FIRST by default; see header).
candidates=()

# This worktree's own .env URL (may be a dead allocated port if no server was started).
wt_url=$(read_env_var "./.env" OPENTHROTTLE_SERVER_APP_URL) || wt_url=""

# The main/root checkout's .env (the shared STABLE server). The git common dir is
# <main>/.git even from inside a linked worktree, so its parent is the main checkout.
root_url=""
common_dir=$(git rev-parse --git-common-dir 2>/dev/null || true)
if [ -n "$common_dir" ]; then
  root_repo=$(cd "$(dirname "$common_dir")" 2>/dev/null && pwd || true)
  if [ -n "$root_repo" ]; then
    root_url=$(read_env_var "$root_repo/.env" OPENTHROTTLE_SERVER_APP_URL) || root_url=""
  fi
fi

if [ "${OT_MCP_TARGET:-}" = "worktree" ]; then
  # Explicit opt-in: prefer this worktree's server (testing server changes via MCP).
  [ -n "$wt_url" ] && candidates+=("$wt_url")
  [ -n "$root_url" ] && candidates+=("$root_url")
else
  # Default: stable-first, so restarting the worktree SUT never interrupts tooling.
  [ -n "$root_url" ] && candidates+=("$root_url")
fi

# A running docker "server" container's published host port (covers the case where
# neither .env matched the only live server).
if command -v docker >/dev/null 2>&1; then
  dport=$(docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null \
    | grep -i 'server' | head -n1 | grep -oE ':[0-9]+->' | head -n1 | tr -d ':->')
  [ -n "$dport" ] && candidates+=("http://localhost:$dport")
fi

# Worktree server as liveness fallback when the stable server is down.
if [ "${OT_MCP_TARGET:-}" != "worktree" ] && [ -n "$wt_url" ]; then
  candidates+=("$wt_url")
fi

# Canonical fallback.
candidates+=("http://localhost:6021")

probe() { curl -fsS -m 2 -o /dev/null "$1/health" 2>/dev/null; }

API_URL=""
tried=()
for url in "${candidates[@]}"; do
  case " ${tried[*]} " in *" $url "*) continue ;; esac  # de-dupe
  tried+=("$url")
  if probe "$url"; then
    API_URL="$url"
    log "✅ openthrottle-mcp -> live server at $url"
    break
  fi
  log "   …no OpenThrottle server at $url"
done

if [ -z "$API_URL" ]; then
  log ""
  log "❌ openthrottle-mcp: no reachable OpenThrottle server found."
  log "   Tried (in order): ${tried[*]}"
  log "   Worktrees share the MAIN checkout's server — they do not start their own."
  log "   Start it from the main checkout:"
  log "       pnpm run database:start && pnpm nx run openthrottle-server:dev"
  exit 1
fi

export API_URL
export API_URL_INTERNAL="$API_URL"

# Load the OT GraphQL auth token the same way we resolve the server: from this worktree's
# .env, falling back to the main/root checkout's .env. The old launcher exported this via
# `set -a && source ./.env`; the targeted-read rewrite dropped it, leaving the MCP server
# unauthenticated ("Auth token required for OpenThrottle (OT) GraphQL"). Don't fail if it
# is absent — the server may inject it another way.
#
# Also self-load when the value is an UNEXPANDED "${...}" placeholder: MCP clients that
# don't (or can't) expand `${OPENTHROTTLE_MCP_AUTH_TOKEN}` from .mcp.json's env block pass
# the literal string through when the var is unset in their launching shell. That literal
# is non-empty, so a bare `-z` guard would skip the fallback and send the placeholder as a
# bearer token → server 401. Treat any value containing "${" as unset.
case "${OPENTHROTTLE_MCP_AUTH_TOKEN:-}" in *'${'*) unset -v OPENTHROTTLE_MCP_AUTH_TOKEN ;; esac
if [ -z "${OPENTHROTTLE_MCP_AUTH_TOKEN:-}" ]; then
  if tok=$(read_env_var "./.env" OPENTHROTTLE_MCP_AUTH_TOKEN) && [ -n "$tok" ]; then
    export OPENTHROTTLE_MCP_AUTH_TOKEN="$tok"
  elif [ -n "${root_repo:-}" ] && tok=$(read_env_var "$root_repo/.env" OPENTHROTTLE_MCP_AUTH_TOKEN) && [ -n "$tok" ]; then
    export OPENTHROTTLE_MCP_AUTH_TOKEN="$tok"
  fi
fi

# Resolve-only mode: print the chosen server and exit (used by tests / health checks).
if [ -n "${OT_MCP_RESOLVE_ONLY:-}" ]; then
  echo "$API_URL"
  exit 0
fi

# --- Preflight auth check (fail loudly; never present a silently-broken MCP) ----------
# The MCP client connects over stdio and lists tools regardless of whether the bearer
# token is valid, so a missing/revoked/rotated token surfaces only as a 401 on EVERY
# authenticated tool call mid-session — a "stale MCP" that looks connected but is dead.
# Validate the resolved token against the chosen server BEFORE exec so a bad token makes
# the server fail to start (loud + visible in the MCP client) instead of connecting broken.
# Opt out with OT_MCP_SKIP_PREFLIGHT=1 (e.g. setups where the server injects the token).
if [ -z "${OT_MCP_SKIP_PREFLIGHT:-}" ]; then
  auth_fail_banner() {
    log ""
    log "❌ openthrottle-mcp: refusing to start — $1"
    log "   Server: $API_URL"
    log "   Fix:"
    log "     1. Provision/verify the token:  pnpm run database:bootstrap-service-accounts"
    log "     2. Set it in the root .env:      OPENTHROTTLE_MCP_AUTH_TOKEN=ot_sa_<prefix>_<secret>"
    log "     3. Reconnect the MCP:            /mcp reconnect   (or restart the client)"
    log "   Details: packages/openthrottle-mcp/docs/AUTH.md"
    log ""
  }

  if [ -z "${OPENTHROTTLE_MCP_AUTH_TOKEN:-}" ]; then
    auth_fail_banner "OPENTHROTTLE_MCP_AUTH_TOKEN is unset (not in the launching env, this worktree's .env, or the root .env)."
    exit 1
  fi

  preflight_out=$(mktemp -t ot-mcp-preflight.XXXXXX)
  http_code=$(curl -s -o "$preflight_out" -w '%{http_code}' -m 10 \
    -X POST "$API_URL/graphql" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${OPENTHROTTLE_MCP_AUTH_TOKEN}" \
    -d '{"query":"query { listSources { sources { name } } }"}' 2>/dev/null || true)

  # NOTE: the GraphQL server answers auth failures with HTTP 200 and an "errors" array
  # ({"errors":[{"message":"Unauthorized",...,"path":["listSources"]}],"data":null}), so
  # HTTP status alone does NOT distinguish success from a bad token, and a naive
  # grep for "listSources" false-passes (it appears in the error's "path"). Decide on the
  # body: any "errors" key ⇒ rejected; otherwise a real "sources" payload ⇒ OK.
  if grep -q '"errors"' "$preflight_out" 2>/dev/null; then
    auth_fail_banner "server rejected the token: $(head -c 200 "$preflight_out" 2>/dev/null)"
    rm -f "$preflight_out"
    exit 1
  fi
  case "$http_code" in
    200)
      if grep -q '"sources"' "$preflight_out" 2>/dev/null; then
        log "🔓 openthrottle-mcp: auth OK (token verified against $API_URL)"
      else
        auth_fail_banner "unexpected HTTP 200 body (no sources payload): $(head -c 200 "$preflight_out" 2>/dev/null)"
        rm -f "$preflight_out"
        exit 1
      fi
      ;;
    401 | 403)
      auth_fail_banner "server returned HTTP $http_code — token invalid/revoked, wrong server, or missing plans:* role."
      rm -f "$preflight_out"
      exit 1
      ;;
    *)
      # Transient/ambiguous (timeout, 5xx). Don't block tooling on a server hiccup, but say so.
      log "⚠️  openthrottle-mcp: auth preflight inconclusive (HTTP ${http_code:-none}); starting anyway. If tools 401, run scripts/verify-openthrottle-mcp-env.sh"
      ;;
  esac
  rm -f "$preflight_out"
fi

# Semantic search embeddings are configured on openthrottle-server (OPENAI_API_KEY or
# OLLAMA_* in applications/openthrottle-server/.env), not in this launcher. See
# docs/openthrottle/run-locally-oss.md and packages/openthrottle-mcp/docs/verification-environment.md.

# pnpm nx run @openthrottle/openthrottle-mcp:build 1>&2
exec node packages/openthrottle-mcp/dist/src/bin.js
