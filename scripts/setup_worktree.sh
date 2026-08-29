#!/usr/bin/env sh
#
# Thin bootstrap shim — ALL logic lives in scripts/setup_worktree.ts.
#
# Kept as .sh because provisioning runs inside a fresh linked worktree BEFORE
# `pnpm install` has populated its node_modules: tsx is resolved from this
# checkout first, then from the primary checkout that linked worktrees share.
# Must be run with cwd = the worktree root (as the ot-worktree skill's
# create/heal actions do).

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && TSX="$(dirname "$COMMON")/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "🔴 setup_worktree: tsx not found — run pnpm install in the primary checkout first" >&2
  exit 1
fi

exec "$TSX" "$DIR/scripts/setup_worktree.ts" "$@"
