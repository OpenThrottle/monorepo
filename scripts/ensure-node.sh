#!/usr/bin/env bash
#
# Server boot gate: fail fast, with the exact fix, when the `node` on PATH does
# not satisfy the root package.json `engines.node`.
#
# Why: `pnpm nx run openthrottle-server:dev|dev-api|worker|start` runs on the
# shell's Node, and only `pnpm install` checks that. An agent's Bash tool gets
# nvm's default alias, not the repo's pin, so the server would otherwise boot
# (or half-boot) on the wrong line. The ensure-migrations and
# ensure-embedding-model gates depend on this one, so it runs first.
#
# Shell, not .ts: it must run, and explain itself, on exactly the Node versions
# it rejects. Usage: ensure-node.sh [<checkout>] (default: this repo).

set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)
CHECKOUT=${1:-$(dirname "$SCRIPT_DIR")}

# shellcheck source=skills/ot-worktree/scripts/resolve-node.sh
. "$SCRIPT_DIR/../skills/ot-worktree/scripts/resolve-node.sh"

PRIMARY=''
COMMON=$(git -C "$CHECKOUT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
[ -n "$COMMON" ] && PRIMARY=$(dirname "$COMMON")

# Resolving first also reads engines.node into OT_NODE_RANGE.
if ot_resolve_node "$CHECKOUT" "$PRIMARY"; then
  RESOLVED=yes
else
  RESOLVED=''
fi

# No engines.node: nothing to enforce.
[ -n "$OT_NODE_RANGE" ] || exit 0

CURRENT=$(node --version 2>/dev/null || true)
if [ -n "$CURRENT" ] && ot_node_satisfies "$CURRENT" "$OT_NODE_RANGE"; then
  exit 0
fi

echo "🔴 Node ${CURRENT:-(none on PATH)} does not satisfy engines.node \"$OT_NODE_RANGE\"." >&2
if [ -n "$RESOLVED" ]; then
  echo "   Run this in the same shell, then retry:" >&2
  echo "     export PATH=\"$OT_NODE_BIN:\$PATH\"" >&2
else
  echo "   No installed Node satisfies it (tried: $OT_NODE_TRIED)." >&2
  echo "   Install one, e.g. \`nvm install\` in $CHECKOUT, then retry." >&2
fi
exit 1
