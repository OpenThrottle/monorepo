#!/usr/bin/env bash

# Run openthrottle-mcp MCP server on stdio. Build output is sent to stderr so stdout
# contains only JSON-RPC for the MCP client.
# Sets WORKTREE_ID from git worktree root basename so each worktree advertises a distinct MCP server name.
#
# Resolves API_URL to the first REACHABLE OpenThrottle server rather than trusting a
# per-worktree .env port that may point at a server that was never started. Worktrees
# share the main checkout's server/Postgres/Redis and do NOT start their own server, so
# the .env's rewritten OPENTHROTTLE_SERVER_APP_URL (e.g. http://localhost:7011) is a dead
# port — see plan "debug(worktree): openthrottle-mcp pins to dead allocated server port".
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

# Build candidate server URLs in priority order.
candidates=()

# 1. This worktree's own .env, IF present and set (preserves a genuine per-worktree server).
if wt_url=$(read_env_var "./.env" OPENTHROTTLE_SERVER_APP_URL) && [ -n "$wt_url" ]; then
  candidates+=("$wt_url")
fi

# 2. The main/root checkout's .env (the shared canonical server). The git common dir is
#    <main>/.git even from inside a linked worktree, so its parent is the main checkout.
common_dir=$(git rev-parse --git-common-dir 2>/dev/null || true)
if [ -n "$common_dir" ]; then
  root_repo=$(cd "$(dirname "$common_dir")" 2>/dev/null && pwd || true)
  if [ -n "$root_repo" ] && root_url=$(read_env_var "$root_repo/.env" OPENTHROTTLE_SERVER_APP_URL) && [ -n "$root_url" ]; then
    candidates+=("$root_url")
  fi
fi

# 3. A running docker "server" container's published host port (covers the reported case
#    where neither .env matched the only live server).
if command -v docker >/dev/null 2>&1; then
  dport=$(docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null \
    | grep -i 'server' | head -n1 | grep -oE ':[0-9]+->' | head -n1 | tr -d ':->')
  [ -n "$dport" ] && candidates+=("http://localhost:$dport")
fi

# 4. Canonical fallback.
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

# Semantic search embeddings are configured on openthrottle-server (OPENAI_API_KEY or
# OLLAMA_* in applications/openthrottle-server/.env), not in this launcher. See
# docs/openthrottle/run-locally-oss.md and packages/openthrottle-mcp/docs/verification-environment.md.

# pnpm nx run @openthrottle/openthrottle-mcp:build 1>&2
exec node packages/openthrottle-mcp/dist/src/bin.js
