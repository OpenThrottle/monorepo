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
  # A non-executable hook is run through its interpreter rather than treated as
  # an error: node for JS/TS (Node 22.18+ strips types natively), sh otherwise.
  (
    cd "$_rh_wt" || exit 1
    OPENTHROTTLE_SOURCE_REPO="$_rh_src"
    OPENTHROTTLE_WORKTREE_PATH="$_rh_wt"
    OPENTHROTTLE_WORKTREE_NAME="$(basename "$_rh_wt")"
    export OPENTHROTTLE_SOURCE_REPO OPENTHROTTLE_WORKTREE_PATH OPENTHROTTLE_WORKTREE_NAME
    if [ -x "$_rh_hook" ]; then
      "$_rh_hook" </dev/null >&2
    else
      case "$_rh_hook" in
        *.ts | *.mts | *.js | *.mjs) node "$_rh_hook" </dev/null >&2 ;;
        *) sh "$_rh_hook" </dev/null >&2 ;;
      esac
    fi
  )
}

# Put the Node that checkout $1 asks for (its .nvmrc / engines.node; $2, the
# primary checkout, supplies a .nvmrc the worktree lacks) first on PATH, and
# export it, so the provisioner and everything it spawns — `pnpm install` and
# its `preinstall` engine check, a `.ts` hook run by bare `node` — use it
# instead of whatever the caller's shell had (an agent's Bash tool gets nvm's
# default alias, not the repo's pin). See resolve-node.sh.
#
# No-op when the checkout declares no engines.node, when bash is missing, or
# when $OPENTHROTTLE_WORKTREE_NODE=0. Returns 1, after logging what was tried,
# when engines.node is declared and nothing installed satisfies it: provisioning
# on the wrong Node fails later and leaves a half-built tree.
ot_worktree_use_repo_node() {
  _un_checkout="$1"
  _un_primary="${2:-}"

  [ "${OPENTHROTTLE_WORKTREE_NODE:-1}" = "0" ] && return 0
  command -v bash >/dev/null 2>&1 || return 0

  _un_tab=$(printf '\t')
  if ! _un_line=$(bash "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/node-path.sh" "$_un_checkout" "$_un_primary"); then
    _un_rest=${_un_line#fail"$_un_tab"}
    log "🔴 no installed Node satisfies engines.node \"${_un_rest%%"$_un_tab"*}\" for $_un_checkout"
    log "    tried: ${_un_rest#*"$_un_tab"}"
    log "    install it (e.g. \`nvm install\` in the checkout), or set OT_NODE=/path/to/node"
    return 1
  fi

  case "$_un_line" in
    ok"$_un_tab"*)
      _un_rest=${_un_line#ok"$_un_tab"}
      _un_bin=${_un_rest%%"$_un_tab"*}
      case "$PATH" in
        "$_un_bin" | "$_un_bin":*) ;;
        *)
          PATH="$_un_bin${PATH:+:$PATH}"
          export PATH
          ;;
      esac
      log "    node:   ${_un_rest#*"$_un_tab"} ($_un_bin)"
      ;;
  esac

  return 0
}

# True (0) when provisioning has been switched off for this invocation.
_ot_setup_disabled() {
  [ "${OPENTHROTTLE_WORKTREE_SETUP:-1}" = "0" ] || [ "${CLAUDE_WORKTREE_SETUP:-1}" = "0" ]
}

# Provision the worktree at $1, with $2 as the primary checkout.
#
# Discovery, first hit wins, all optional:
#   1. $OPENTHROTTLE_WORKTREE_PROVISION
#   2. .worktree/provision.sh
#   3. scripts/setup_worktree.ts
#   4. scripts/setup_worktree.sh (branches that predate the .ts)
#
# No provisioner is a valid outcome, not an error. A provisioner that fails
# propagates its exit code — better to fail loudly than hand back a half-built tree.
provision_worktree() {
  _pw_wt="$1"
  _pw_src="$2"

  if _ot_setup_disabled; then
    log "⏭️  OPENTHROTTLE_WORKTREE_SETUP=0 — skipping provisioning"
    return 0
  fi

  ot_worktree_use_repo_node "$_pw_wt" "$_pw_src" || return 1

  for _pw_candidate in \
    "${OPENTHROTTLE_WORKTREE_PROVISION:-}" \
    ".worktree/provision.sh" \
    "scripts/setup_worktree.ts" \
    "scripts/setup_worktree.sh"; do
    if _pw_hook="$(_ot_hook_path "$_pw_wt" "$_pw_candidate")"; then
      _ot_run_hook "provision" "$_pw_hook" "$_pw_wt" "$_pw_src"
      return $?
    fi
  done

  log "ℹ️  no repo provisioner found — worktree created but not provisioned"

  return 0
}

# Run the repo's HEAL hook for the already-provisioned worktree at $1, with $2
# as the primary checkout. This is where a repo backfills state onto worktrees
# provisioned by an OLDER provisioner (a new marker, a renamed env var) — heal.sh
# runs it on every heal of a provisioned worktree, so it must be idempotent and
# cheap. Discovery, first hit wins, all optional:
#   1. $OPENTHROTTLE_WORKTREE_HEAL   2. .worktree/heal.sh   3. scripts/heal_worktree.ts
# No hook is a valid outcome. A failing hook is NOT fatal: heal runs before every
# `dev`, and a backfill problem must not wedge the dev loop — it is logged loudly.
heal_worktree_hook() {
  _hw_wt="$1"
  _hw_src="$2"

  if _ot_setup_disabled; then
    return 0
  fi

  # A heal hook is a backfill, never worth wedging `dev` over: on no usable
  # Node, it still runs (on the caller's) after the logged error.
  ot_worktree_use_repo_node "$_hw_wt" "$_hw_src" || true

  for _hw_candidate in \
    "${OPENTHROTTLE_WORKTREE_HEAL:-}" \
    ".worktree/heal.sh" \
    "scripts/heal_worktree.ts"; do
    if _hw_hook="$(_ot_hook_path "$_hw_wt" "$_hw_candidate")"; then
      _ot_run_hook "heal" "$_hw_hook" "$_hw_wt" "$_hw_src" ||
        log "⚠️  heal hook failed ($_hw_hook) — continuing"
      return 0
    fi
  done

  return 0
}

# Tear the worktree at $1 down, with $2 as the primary checkout. Mirrors
# provision_worktree minus the scripts/ rungs (no incumbent to preserve).
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
