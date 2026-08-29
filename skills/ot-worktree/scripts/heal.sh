#!/usr/bin/env sh
#
# ot-worktree: HEAL — lazy self-heal guard for git worktrees.
#
# git has no post-`worktree add` hook, so a plain `git worktree add` (a human at
# the terminal, CI, another agent, a future editor) creates a worktree that never
# runs the repo's provisioner — leaving it unusable in whatever way that repo
# cares about. Creation-time wiring can't catch that. This guard catches it on
# first USE instead: it runs before `dev` (wired via nx.json targetDefaults) and,
# when it finds an unprovisioned linked worktree, provisions it once.
#
# It is a no-op in the primary checkout and on already-provisioned worktrees, so
# the common dev path pays only a couple of `git rev-parse` calls.

set -e

OPENTHROTTLE_WORKTREE_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
# shellcheck source=skills/ot-worktree/scripts/common.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/common.sh"
# shellcheck source=skills/ot-worktree/scripts/provision.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/provision.sh"

# 1. Only ever act inside a LINKED worktree. Anything else → no-op.
is_linked_worktree || exit 0

_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# 2. Fast path: already provisioned (skill marker, or the repo's declared marker
#    files for worktrees that predate the skill) → exit immediately.
worktree_is_provisioned "$_root" && exit 0

# 3. Unprovisioned linked worktree → provision it once, then mark it so the next
#    run takes the fast path.
_src=$(primary_checkout "$_root")
log "🌳 self-heal: worktree '$_root' is unprovisioned — running the repo provisioner"
provision_worktree "$_root" "$_src"
worktree_mark_provisioned "$_root"
