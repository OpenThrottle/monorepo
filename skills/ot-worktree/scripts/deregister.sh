#!/usr/bin/env sh
#
# Best-effort removal of a torn-down worktree's OpenThrottle checkout record.
#
# OpenThrottle registers a worktree as a repository_checkouts row when a plan run
# works in it. Removing the directory does not remove that row, so without this the
# repositories page keeps listing worktrees that no longer exist. destroy.sh calls
# deregister_worktree_checkout right after `git worktree remove` succeeds.
#
# The same request, made while the worktree still exists, is destroy.sh's
# pre-removal active-run check (worktree_has_active_plan_run, below).
#
# Strictly fail-open: deregistration runs AFTER the worktree is gone, so nothing
# here may fail the removal. No curl, no endpoint, no token, a server that is down, or an
# error response all log one line and return 0. A record left behind this way is
# still flagged "Missing on disk" on the repositories page and can be pruned there.
#
# Endpoint and token resolve by LOCATION, the same ladder the agentic hooks use
# (packages/agentic-hooks/src/config/env.ts), so a teardown talks to the same
# server a hook in this checkout would:
#   1. <primary checkout>/.env — only when the primary is an OpenThrottle checkout.
#      The PRIMARY, not the worktree: the record lives in the server the primary
#      runs, and a provisioned worktree's .env points at its own, separate stack.
#   2. the ambient environment.
#   3. ~/.openthrottle/.env.
#
# Set OPENTHROTTLE_WORKTREE_DEREGISTER=0 to skip it.
#
# Sourced, never executed. POSIX sh. Requires log() from common.sh.

# True (0) when the directory is an OpenThrottle checkout — the gate on reading its
# .env, so a foreign repo's .env is never opened.
_ot_is_openthrottle_checkout() {
  grep -q '"name"[[:space:]]*:[[:space:]]*"openthrottle-server"' \
    "$1/applications/openthrottle-server/project.json" 2>/dev/null
}

# The last value of KEY in a dotenv file, quotes stripped; empty when absent.
# $1 = file, $2 = key (a fixed OPENTHROTTLE_* constant, never user input).
_ot_env_file_value() {
  [ -f "$1" ] || return 0
  sed -n "s/^[[:space:]]*\(export[[:space:]][[:space:]]*\)\{0,1\}$2[[:space:]]*=[[:space:]]*//p" "$1" |
    tail -n 1 |
    sed "s/[[:space:]]*\$//; s/^\"\(.*\)\"\$/\1/; s/^'\(.*\)'\$/\1/"
}

# One key from one layer of the ladder. $1 = layer, $2 = primary checkout, $3 = key.
_ot_layer_value() {
  case "$1" in
    repo) _ot_is_openthrottle_checkout "$2" && _ot_env_file_value "$2/.env" "$3" ;;
    env) eval "printf '%s' \"\${$3:-}\"" ;;
    user) _ot_env_file_value "${HOME:-}/.openthrottle/.env" "$3" ;;
  esac
  return 0
}

# The GraphQL endpoint. Each layer must give a COMPLETE answer before the next is
# asked, so a layer that only sets OPENTHROTTLE_SERVER_APP_URL is never married to
# a lower layer's OPENTHROTTLE_GRAPHQL_URL. $1 = primary checkout.
_ot_graphql_url() {
  for _gu_layer in repo env user; do
    _gu_url=$(_ot_layer_value "$_gu_layer" "$1" OPENTHROTTLE_GRAPHQL_URL)
    [ -n "$_gu_url" ] ||
      _gu_url=$(_ot_layer_value "$_gu_layer" "$1" OPENTHROTTLE_WORKER_GRAPHQL_URL)
    if [ -z "$_gu_url" ]; then
      _gu_app=$(_ot_layer_value "$_gu_layer" "$1" OPENTHROTTLE_SERVER_APP_URL)
      [ -n "$_gu_app" ] && _gu_url="${_gu_app%/}/graphql"
    fi
    if [ -n "$_gu_url" ]; then
      printf '%s' "${_gu_url%/}"
      return 0
    fi
  done
  return 1
}

# The service-account token: the MCP token from any layer, then the worker token.
# $1 = primary checkout.
_ot_auth_token() {
  for _at_key in OPENTHROTTLE_MCP_AUTH_TOKEN OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN; do
    for _at_layer in repo env user; do
      _at_value=$(_ot_layer_value "$_at_layer" "$1" "$_at_key")
      if [ -n "$_at_value" ]; then
        printf '%s' "$_at_value"
        return 0
      fi
    done
  done
  return 1
}

# POST deregisterWorktreeCheckout for a path and print the server's outcome
# (PRUNED, NOT_FOUND, SKIPPED_ACTIVE_RUN, SKIPPED_LIVE, SKIPPED_PRIMARY), or
# nothing when it answered without one. Returns 1 — after logging why — when
# there is no curl, no endpoint, no token or no reachable server.
# $1 = worktree path, $2 = primary checkout, $3 = what the caller is doing (for logs).
_ot_deregister_request() {
  _dr_wt="$1"
  _dr_src="$2"
  _dr_doing="$3"

  if ! command -v curl >/dev/null 2>&1; then
    log "ℹ️  curl not found — skipping $_dr_doing"
    return 1
  fi
  if ! _dr_url=$(_ot_graphql_url "$_dr_src"); then
    log "ℹ️  no OpenThrottle endpoint configured — skipping $_dr_doing"
    return 1
  fi
  if ! _dr_token=$(_ot_auth_token "$_dr_src"); then
    log "ℹ️  no OpenThrottle token configured — skipping $_dr_doing"
    return 1
  fi

  # JSON-escape the only interpolated value; the rest of the body is a constant.
  _dr_path=$(printf '%s' "$_dr_wt" | sed 's/\\/\\\\/g; s/"/\\"/g')
  # The $input in the body is a GraphQL variable, not shell.
  # shellcheck disable=SC2016
  _dr_body=$(printf '{"query":"mutation DeregisterWorktreeCheckout($input: DeregisterWorktreeCheckoutInput!) { deregisterWorktreeCheckout(input: $input) { outcome } }","variables":{"input":{"filesystemPath":"%s"}}}' "$_dr_path")

  if ! _dr_response=$(curl -sS --max-time 5 -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $_dr_token" \
    --data "$_dr_body" "$_dr_url" 2>&1); then
    log "⚠️  could not reach OpenThrottle at $_dr_url for $_dr_doing"
    log "    $_dr_response"
    return 1
  fi

  _dr_outcome=$(printf '%s' "$_dr_response" | sed -n 's/.*"outcome"[[:space:]]*:[[:space:]]*"\([A-Z_]*\)".*/\1/p')
  [ -n "$_dr_outcome" ] ||
    log "⚠️  OpenThrottle gave no outcome for $_dr_doing: $(printf '%s' "$_dr_response" | cut -c 1-300)"
  printf '%s' "$_dr_outcome"
  return 0
}

# True (0) when OpenThrottle says a plan run that has not been settled points at
# the worktree — the one question destroy.sh must ask BEFORE it removes anything.
#
# It asks through deregisterWorktreeCheckout while the worktree still exists. That
# is safe by the server's guard order (WorktreeCheckoutPruneService): an unsettled
# run answers SKIPPED_ACTIVE_RUN, and a live linked worktree answers SKIPPED_LIVE,
# both before any delete — so a probe on a live path can never drop its record.
#
# Fail-open, like deregistration: no curl, endpoint, token or server answers 1
# (not busy), so a foreign repo or an offline laptop keeps its old behaviour. Set
# OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD=0 to skip the probe.
#
# Leaves what the probe saw in OT_ACTIVE_RUN_PROBE for destroy.sh's removal log:
# `disabled`, `unavailable` (no curl, endpoint, token or server), `no-outcome`, or
# the server's outcome (SKIPPED_ACTIVE_RUN, SKIPPED_LIVE, ...). Call it directly,
# never in a command substitution, or the value is lost with the subshell.
# $1 = worktree path, $2 = primary checkout.
# shellcheck disable=SC2034 # OT_ACTIVE_RUN_PROBE is read by destroy.sh
worktree_has_active_plan_run() {
  if [ "${OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD:-1}" = "0" ]; then
    OT_ACTIVE_RUN_PROBE=disabled
    log "ℹ️  OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD=0 — not asking OpenThrottle whether a plan run is using this worktree"
    return 1
  fi
  if ! _ar_outcome=$(_ot_deregister_request "$1" "$2" "the active-plan-run check"); then
    OT_ACTIVE_RUN_PROBE=unavailable
    return 1
  fi
  OT_ACTIVE_RUN_PROBE="${_ar_outcome:-no-outcome}"
  [ "$_ar_outcome" = "SKIPPED_ACTIVE_RUN" ]
}

# $1 = the removed worktree's absolute path, $2 = primary checkout. Always returns 0.
deregister_worktree_checkout() {
  _dw_wt="$1"
  _dw_src="$2"

  if [ "${OPENTHROTTLE_WORKTREE_DEREGISTER:-1}" = "0" ]; then
    log "ℹ️  OPENTHROTTLE_WORKTREE_DEREGISTER=0 — leaving the OpenThrottle checkout record alone"
    return 0
  fi

  _dw_outcome=$(_ot_deregister_request "$_dw_wt" "$_dw_src" "checkout deregistration") || return 0

  case "$_dw_outcome" in
    PRUNED) log "🧹 removed the worktree's OpenThrottle checkout record" ;;
    NOT_FOUND) log "ℹ️  OpenThrottle had no checkout record for this worktree" ;;
    SKIPPED_ACTIVE_RUN) log "⚠️  OpenThrottle kept this worktree's record: a plan run that has not been settled still points at it" ;;
    "") ;;
    *) log "ℹ️  OpenThrottle kept this worktree's record ($_dw_outcome)" ;;
  esac
  return 0
}
