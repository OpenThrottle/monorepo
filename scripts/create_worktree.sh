#!/usr/bin/env sh
#
# Thin bootstrap shim — ALL logic lives in scripts/create_worktree.ts.
#
# Kept as .sh because this exact path is baked into external configs (the
# Claude Code WorktreeCreate hook in .claude/settings.json and Cursor's
# .cursor/worktrees.json), and because Cursor's provision-in-place mode runs
# it inside a fresh linked worktree that has no node_modules yet: tsx is
# resolved from this checkout first, then from the primary checkout that
# linked worktrees share. stdin/args/stdout pass through untouched, so the
# hook contract (stdout = worktree path only) is owned by the .ts.

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && TSX="$(dirname "$COMMON")/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "🔴 create_worktree: tsx not found — run pnpm install in the primary checkout first" >&2
  exit 1
fi

exec "$TSX" "$DIR/scripts/create_worktree.ts" "$@"
