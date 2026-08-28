#!/usr/bin/env bash
#
# Thin launcher shim — ALL logic lives in scripts/run-openthrottle-mcp.ts.
#
# Kept as .sh because this absolute path is baked into user-global MCP client
# configs (~/.claude.json, ~/.cursor/mcp.json — written by
# setup_mcp-instructions.ts), so existing registrations keep working without a
# config migration. MCP clients spawn it with a minimal env from an arbitrary
# cwd, so tsx is resolved from this checkout's node_modules (falling back to
# the primary checkout for a not-yet-installed worktree).
#
# stdio contract: stdout carries ONLY JSON-RPC — the .ts owns that discipline;
# this shim writes nothing to stdout.

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && TSX="$(dirname "$COMMON")/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "🔴 run-openthrottle-mcp: tsx not found — run pnpm install in the checkout first" >&2
  exit 1
fi

exec "$TSX" "$DIR/scripts/run-openthrottle-mcp.ts" "$@"
