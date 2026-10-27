#!/usr/bin/env bash
#
# Thin launcher shim — server logic lives in scripts/run-openthrottle-mcp.ts.
#
# Kept as .sh because this absolute path is baked into user-global MCP client
# configs (~/.claude.json, ~/.cursor/mcp.json — written by
# setup_mcp-instructions.ts), so existing registrations keep working without a
# config migration. MCP clients spawn it with a minimal env from an arbitrary
# cwd, so tsx is resolved from this checkout's node_modules (falling back to
# the primary checkout for a not-yet-installed worktree).
#
# The shim also pins Node. The client's PATH is often not the repo's Node: the
# Claude desktop app puts every nvm install on PATH oldest-first (so `node` is
# v16, which has no global `fetch`), and `env -i` has no `node` at all. The
# chosen Node's bin dir goes on the front of PATH before tsx starts, so tsx's
# `#!/usr/bin/env node` and the .ts's `spawnSync('node', …)` both run on it.
# How it is chosen, and the OT_MCP_NODE override: scripts/utils/resolve-node.sh.
#
# stdio contract: stdout carries ONLY JSON-RPC — the .ts owns that discipline;
# this shim writes nothing to stdout.

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

# The primary checkout, only when a worktree is missing something (git costs a spawn).
PRIMARY=''
if [ ! -x "$DIR/node_modules/.bin/tsx" ] || [ ! -f "$DIR/.nvmrc" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && PRIMARY=$(dirname "$COMMON")
fi

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ] && [ -n "$PRIMARY" ]; then
  TSX="$PRIMARY/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "🔴 run-openthrottle-mcp: tsx not found — run pnpm install in the checkout first" >&2
  exit 1
fi

. "$DIR/scripts/utils/resolve-node.sh"

if ! ot_resolve_node "$DIR" "$PRIMARY"; then
  echo "🔴 run-openthrottle-mcp: no Node satisfying engines.node \"$OT_NODE_RANGE\" — tried: $OT_NODE_TRIED. Install one (nvm install), or set OT_MCP_NODE to a node binary in the MCP config's env block." >&2
  exit 1
fi

PATH="$OT_NODE_BIN${PATH:+:$PATH}"
export PATH

exec "$TSX" "$DIR/scripts/run-openthrottle-mcp.ts" "$@"
