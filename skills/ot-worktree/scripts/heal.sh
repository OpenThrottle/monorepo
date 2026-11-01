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
# It is a no-op in the primary checkout. On an already-provisioned worktree it only
# runs the repo's optional, idempotent heal hook (a backfill), so the common dev
# path pays a couple of `git rev-parse` calls plus that hook.

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
#    files for worktrees that predate the skill) → nothing to provision. Give the
#    repo's optional heal hook a chance to backfill state onto worktrees an older
#    provisioner built (see heal_worktree_hook), then exit.
if worktree_is_provisioned "$_root"; then
  heal_worktree_hook "$_root" "$(primary_checkout "$_root")"
  exit 0
fi

# 3. Unprovisioned linked worktree → provision it once, then mark it so the next
#    run takes the fast path.
_src=$(primary_checkout "$_root")
log "🌳 self-heal: worktree '$_root' is unprovisioned — running the repo provisioner"
provision_worktree "$_root" "$_src"
worktree_mark_provisioned "$_root"
