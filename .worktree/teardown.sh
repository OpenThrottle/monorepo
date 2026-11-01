#!/usr/bin/env sh
#
# Thin entry — ALL logic lives in scripts/teardown_worktree.ts, which runs
# directly under bare Node's native type stripping (no tsx), the same way
# scripts/setup_worktree.ts does.
#
# Discovered by the ot-worktree skill's destroy action (hook rung 2), run with
# cwd = the worktree, immediately before the worktree is removed. It stays a .sh
# rather than becoming a .ts rung in the skill because teardown discovery is a
# cross-repo contract (references/contract.md) with no scripts/ rungs, and this
# one exec line is all that keeping it costs.
#
# A missing node is NOT a failure here. Teardown's job is to stop containers the
# provisioner started, and the provisioner needs node too; a worktree that never
# got that far started nothing. Exiting non-zero would block the removal for no
# reason — the skill treats a failed teardown as "refuse to remove".

set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

if ! command -v node >/dev/null 2>&1; then
  echo "⚠ teardown_worktree: node not found — skipping compose teardown (nothing was provisioned)" >&2
  exit 0
fi

exec "$DIR/scripts/teardown_worktree.ts" "$@"
