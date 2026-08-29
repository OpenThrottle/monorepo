#!/usr/bin/env sh
#
# Delegation to the repo's own provision / teardown hooks.
#
# The skill knows how to make a worktree EXIST. Only the repo knows how to make
# it USABLE (dependencies, .env, ports, containers). Everything repo-specific
# lives behind these hooks; see ../references/contract.md.
#
# Sourced, never executed. Requires log() from common.sh.

# Resolve a hook candidate to a runnable absolute path, or return 1.
# $1 = worktree, $2 = candidate (absolute, or relative to the worktree).
_ot_hook_path() {
  _hp_wt="$1"
  _hp_candidate="$2"
  [ -n "$_hp_candidate" ] || return 1
  case "$_hp_candidate" in
    /*) _hp_abs="$_hp_candidate" ;;
    *) _hp_abs="$_hp_wt/$_hp_candidate" ;;
  esac
  # A directory, a socket or an unreadable file is never something we exec.
  [ -f "$_hp_abs" ] && [ -r "$_hp_abs" ] || return 1
  printf '%s' "$_hp_abs"
}

# Run a resolved hook with the contract's environment.
# $1 = kind (for logs), $2 = hook path, $3 = worktree, $4 = primary checkout.
_ot_run_hook() {
  _rh_kind="$1"
  _rh_hook="$2"
  _rh_wt="$3"
  _rh_src="$4"

  log "    $_rh_kind: $_rh_hook"

  # cwd = the worktree; stdin closed so any prompt takes its default instead of
  # hanging; stdout folded into stderr so create.sh's path-only stdout survives.
  # A non-executable hook is run through sh rather than treated as an error.
  (
    cd "$_rh_wt" || exit 1
    OPENTHROTTLE_SOURCE_REPO="$_rh_src"
    OPENTHROTTLE_WORKTREE_PATH="$_rh_wt"
    OPENTHROTTLE_WORKTREE_NAME="$(basename "$_rh_wt")"
    export OPENTHROTTLE_SOURCE_REPO OPENTHROTTLE_WORKTREE_PATH OPENTHROTTLE_WORKTREE_NAME
    if [ -x "$_rh_hook" ]; then
      "$_rh_hook" </dev/null >&2
    else
      sh "$_rh_hook" </dev/null >&2
    fi
  )
}

# True (0) when provisioning has been switched off for this invocation.
_ot_setup_disabled() {
  [ "${OPENTHROTTLE_WORKTREE_SETUP:-1}" = "0" ] || [ "${CLAUDE_WORKTREE_SETUP:-1}" = "0" ]
}

# Provision the worktree at $1, with $2 as the primary checkout.
# Discovery, first hit wins, all optional:
#   1. $OPENTHROTTLE_WORKTREE_PROVISION   2. .worktree/provision.sh   3. scripts/setup_worktree.sh
# No provisioner is a valid outcome, not an error. A provisioner that fails
# propagates its exit code — better to fail loudly than hand back a half-built tree.
provision_worktree() {
  _pw_wt="$1"
  _pw_src="$2"

  if _ot_setup_disabled; then
    log "⏭️  OPENTHROTTLE_WORKTREE_SETUP=0 — skipping provisioning"
    return 0
  fi

  for _pw_candidate in \
    "${OPENTHROTTLE_WORKTREE_PROVISION:-}" \
    ".worktree/provision.sh" \
    "scripts/setup_worktree.sh"; do
    if _pw_hook="$(_ot_hook_path "$_pw_wt" "$_pw_candidate")"; then
      _ot_run_hook "provision" "$_pw_hook" "$_pw_wt" "$_pw_src"
      return $?
    fi
  done

  log "ℹ️  no repo provisioner found — worktree created but not provisioned"
  return 0
}

# Tear the worktree at $1 down, with $2 as the primary checkout. Mirrors
# provision_worktree minus the scripts/ rung (no incumbent to preserve).
# A teardown that fails ABORTS the removal — that is where a repo stops a
# container or releases a port lease, and removing anyway would leak it.
teardown_worktree() {
  _tw_wt="$1"
  _tw_src="$2"

  for _tw_candidate in \
    "${OPENTHROTTLE_WORKTREE_TEARDOWN:-}" \
    ".worktree/teardown.sh"; do
    if _tw_hook="$(_ot_hook_path "$_tw_wt" "$_tw_candidate")"; then
      _ot_run_hook "teardown" "$_tw_hook" "$_tw_wt" "$_tw_src"
      return $?
    fi
  done

  log "ℹ️  no repo teardown hook found — nothing to run before removal"
  return 0
}
