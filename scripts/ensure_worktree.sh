#!/usr/bin/env sh
#
# Lazy self-heal guard for git worktrees.
#
# git has no post-`worktree add` hook, so a plain `git worktree add` (a human at
# the terminal, CI, another agent, a future editor) creates a worktree that never
# runs scripts/setup_worktree.sh — leaving it with no .env, canonical 6020-6025
# ports, and placeholder service-account tokens. Creation-time wiring can't catch
# that. This guard catches it on first USE instead: it runs before `dev` (wired
# via nx.json targetDefaults.dev.dependsOn -> monorepo:ensure-worktree) and, when
# it finds an unprovisioned linked worktree, provisions it once.
#
# It is a no-op in the primary checkout and on already-provisioned worktrees, so
# the common dev path pays only a couple of `git rev-parse` calls.

set -e

# 1. Only ever act inside a LINKED worktree. In the primary checkout --git-dir
#    and --git-common-dir resolve to the same path; in a linked worktree the
#    per-worktree admin dir (.../.git/worktrees/<name>) differs from the shared
#    common dir. Anything that isn't a clear linked worktree → no-op.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
_git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
_git_common=$(git rev-parse --git-common-dir 2>/dev/null) || exit 0
_git_dir_abs=$(cd "$_git_dir" 2>/dev/null && pwd -P) || exit 0
_git_common_abs=$(cd "$_git_common" 2>/dev/null && pwd -P) || exit 0
[ "$_git_dir_abs" = "$_git_common_abs" ] && exit 0   # primary checkout → no-op

_root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

# 2. Fast-path: already provisioned? setup_worktree.sh writes both a root .env
#    (from setup_environment.sh) and a .worktree-ports pin (from
#    worktree_ports.sh). Both are .gitignored, so a fresh `git worktree add` has
#    neither. When both exist the worktree is provisioned — exit immediately.
#    setup_worktree.sh is itself idempotent, so re-running is safe; this early
#    exit just keeps the common case near-zero latency.
if [ -f "$_root/.env" ] && [ -f "$_root/.worktree-ports" ]; then
  exit 0
fi

# 3. Unprovisioned linked worktree → provision it once. stdin is closed so any
#    prompt takes its default instead of blocking. OT_SOURCE_REPO points setup at
#    the primary checkout (parent of the shared git common dir) so real
#    service-account tokens are copied into the reset-to-default .env files.
_src=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
echo "🌳 self-heal: worktree '$_root' is unprovisioned — running setup_worktree.sh" >&2
( cd "$_root" && OT_SOURCE_REPO="$_src" ./scripts/setup_worktree.sh </dev/null >&2 )
