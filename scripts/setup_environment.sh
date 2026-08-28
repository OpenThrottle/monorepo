#!/usr/bin/env sh
#
# Thin bootstrap shim — ALL logic lives in scripts/setup_environment.ts.
#
# Kept as .sh because the app READMEs document this path and because it can
# run inside a fresh linked worktree before `pnpm install`: tsx is resolved
# from this checkout first, then from the primary checkout that linked
# worktrees share.

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && TSX="$(dirname "$COMMON")/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "🔴 setup_environment: tsx not found — run pnpm install in the primary checkout first" >&2
  exit 1
fi

exec "$TSX" "$DIR/scripts/setup_environment.ts" "$@"
