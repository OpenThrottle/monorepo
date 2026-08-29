#!/usr/bin/env sh
#
# Thin bootstrap shim — ALL logic lives in scripts/teardown_worktree.ts.
#
# Discovered by the ot-worktree skill's destroy action (hook rung 2), run with
# cwd = the worktree, immediately before the worktree is removed. Mirrors
# scripts/setup_worktree.sh, including its tsx resolution: teardown runs against
# a worktree that may be half-provisioned or have had its node_modules pruned,
# so tsx is resolved from this checkout first, then from the primary checkout
# that linked worktrees share.
#
# A missing tsx is NOT a failure here. Teardown's job is to stop containers the
# provisioner started; a worktree that never got far enough to have tsx never
# got far enough to start them. Exiting non-zero would block the removal for no
# reason — the skill treats a failed teardown as "refuse to remove".

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

TSX="$DIR/node_modules/.bin/tsx"
if [ ! -x "$TSX" ]; then
  COMMON=$(git -C "$DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
  [ -n "$COMMON" ] && TSX="$(dirname "$COMMON")/node_modules/.bin/tsx"
fi

if [ ! -x "$TSX" ]; then
  echo "⚠ teardown_worktree: tsx not found — skipping compose teardown (nothing was provisioned)" >&2
  exit 0
fi

exec "$TSX" "$DIR/scripts/teardown_worktree.ts" "$@"
