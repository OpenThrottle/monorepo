#!/usr/bin/env bash
#
# Thin launcher shim — server logic lives in scripts/run-openthrottle-mcp.ts.
#
# Kept as .sh because this absolute path is baked into user-global MCP client
# configs (~/.claude.json, ~/.cursor/mcp.json — written by
# setup_mcp-instructions.ts), so existing registrations keep working without a
# config migration. MCP clients spawn it with a minimal env from an arbitrary
# cwd.
#
# The shim's one job is pinning Node. The client's PATH is often not the repo's
# Node: the Claude desktop app puts every nvm install on PATH oldest-first (so
# `node` is v16, which has no global `fetch`), and `env -i` has no `node` at
# all. The chosen Node runs the .ts directly — every engines.node line strips
# types natively, so there is no tsx — and its bin dir goes on the front of PATH
# so the .ts's `spawnSync('node', …)` runs on it too. How it is chosen, and the
# OT_MCP_NODE override: scripts/utils/resolve-node.sh.
#
# stdio contract: stdout carries ONLY JSON-RPC — the .ts owns that discipline;
# this shim writes nothing to stdout.

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

# The primary checkout, only when a worktree has no .nvmrc (git costs a spawn).
PRIMARY=''
if [ ! -f "$DIR/.nvmrc" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && PRIMARY=$(dirname "$COMMON")
fi

. "$DIR/scripts/utils/resolve-node.sh"

if ! ot_resolve_node "$DIR" "$PRIMARY"; then
  echo "🔴 run-openthrottle-mcp: no Node satisfying engines.node \"$OT_NODE_RANGE\" — tried: $OT_NODE_TRIED. Install one (nvm install), or set OT_MCP_NODE to a node binary in the MCP config's env block." >&2
  exit 1
fi

PATH="$OT_NODE_BIN${PATH:+:$PATH}"
export PATH

exec "$OT_NODE_BIN/node" "$DIR/scripts/run-openthrottle-mcp.ts" "$@"
