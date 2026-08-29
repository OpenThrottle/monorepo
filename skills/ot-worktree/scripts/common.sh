#!/usr/bin/env sh
#
# Shared helpers for the ot-worktree actions (create / heal / destroy).
#
# Sourced, never executed. POSIX sh — no bashisms — so it works under whatever
# /bin/sh a foreign repo's hooks or CI happen to run.

# Everything the skill says goes to stderr. stdout is reserved for the worktree
# path, because Claude Code's WorktreeCreate hook reads it as the hook's result.
log() {
  printf '%s\n' "$*" >&2
}

# True (0) when the given directory (default: cwd) is a LINKED worktree rather
# than the primary checkout. Linked worktrees have a per-worktree admin dir
# (.../.git/worktrees/<name>); in the primary checkout --git-dir and
# --git-common-dir resolve to the same path.
is_linked_worktree() {
  _ilw_dir="${1:-.}"
  [ -d "$_ilw_dir" ] || return 1
  (
    cd "$_ilw_dir" 2>/dev/null || exit 1
    git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 1
    _gd=$(git rev-parse --git-dir 2>/dev/null) || exit 1
    _gc=$(git rev-parse --git-common-dir 2>/dev/null) || exit 1
    _gda=$(cd "$_gd" 2>/dev/null && pwd -P) || exit 1
    _gca=$(cd "$_gc" 2>/dev/null && pwd -P) || exit 1
    [ "$_gda" != "$_gca" ]
  )
}

# Absolute path of the primary checkout: the parent of the shared git common dir.
# Works from the primary checkout and from any linked worktree.
primary_checkout() {
  _pc_dir="${1:-.}"
  (
    cd "$_pc_dir" 2>/dev/null || exit 1
    _common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 1
    dirname "$_common"
  )
}

# Reduce an arbitrary name (a branch ref, a hook payload field, a CLI arg) to
# something safe as both a directory name and a branch segment.
sanitize_worktree_name() {
  _swn="${1:-}"
  _swn="${_swn##refs/heads/}"
  _swn=$(printf '%s' "$_swn" | tr -c 'A-Za-z0-9._-' '-' | sed 's/^-*//; s/-*$//')
  [ -z "$_swn" ] && _swn="wt-$$"
  printf '%s' "$_swn"
}

# --- provisioned marker -----------------------------------------------------
#
# heal.sh needs to know whether a worktree has been provisioned without
# hardcoding any repo's marker files. The skill writes its own marker into the
# worktree's git admin dir (.git/worktrees/<name>/) — per-worktree, outside the
# work tree, and it disappears with the worktree. See ../references/contract.md.

worktree_marker_path() {
  _wmp_dir=$(git -C "${1:-.}" rev-parse --absolute-git-dir 2>/dev/null) || return 1
  printf '%s/ot-worktree-provisioned' "$_wmp_dir"
}

worktree_mark_provisioned() {
  _wmk="$(worktree_marker_path "${1:-.}")" || return 0
  : >"$_wmk" 2>/dev/null || true
}

# True (0) when the worktree at $1 is already provisioned. The skill's own
# marker is authoritative; otherwise fall back to the repo-declared marker files
# (OPENTHROTTLE_WORKTREE_PROVISIONED_MARKERS, default `.env`) so worktrees created before
# this skill existed are not needlessly re-provisioned — and adopt them by
# writing the marker.
worktree_is_provisioned() {
  _wip_wt="${1:-.}"
  _wip_marker="$(worktree_marker_path "$_wip_wt")" || return 1
  [ -f "$_wip_marker" ] && return 0

  for _wip_rel in ${OPENTHROTTLE_WORKTREE_PROVISIONED_MARKERS:-.env}; do
    [ -e "$_wip_wt/$_wip_rel" ] || return 1
  done

  worktree_mark_provisioned "$_wip_wt"
  return 0
}

# --- target validation ------------------------------------------------------

# Canonicalize an existing directory path (resolves symlinks, strips `..`).
abs_dir() {
  (cd "${1:-.}" 2>/dev/null && pwd -P)
}

# True (0) when $2 is a LINKED worktree registered against the primary checkout
# $1 — i.e. a legitimate target for provisioning or removal. This is the single
# notion of "a worktree of this repo" the three actions share; in particular it
# is what stops destroy.sh from ever pointing at the primary checkout.
is_registered_worktree() {
  _irw_primary="$1"
  _irw_target="$(abs_dir "$2")" || return 1
  [ -n "$_irw_target" ] || return 1

  # The primary checkout is never a removable/linked worktree.
  [ "$_irw_target" = "$(abs_dir "$_irw_primary")" ] && return 1
  is_linked_worktree "$_irw_target" || return 1

  # And git must actually know about it under this repo's common dir.
  git -C "$_irw_primary" worktree list --porcelain 2>/dev/null \
    | sed -n 's/^worktree //p' \
    | while IFS= read -r _irw_listed; do
        [ "$(abs_dir "$_irw_listed")" = "$_irw_target" ] && exit 0
      done
  # The subshell above exits 0 only on a match; `while` in a pipeline is a
  # subshell, so its exit status is the pipeline's.
}
