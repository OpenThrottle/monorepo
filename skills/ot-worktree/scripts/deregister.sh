#!/usr/bin/env sh
#
# Best-effort removal of a torn-down worktree's OpenThrottle checkout record.
#
# OpenThrottle registers a worktree as a repository_checkouts row when a plan run
# works in it. Removing the directory does not remove that row, so without this the
# repositories page keeps listing worktrees that no longer exist. destroy.sh calls
# deregister_worktree_checkout right after `git worktree remove` succeeds.
#
# Strictly fail-open: this runs AFTER the worktree is gone, so nothing here may
# fail the removal. No curl, no endpoint, no token, a server that is down, or an
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

# $1 = the removed worktree's absolute path, $2 = primary checkout. Always returns 0.
deregister_worktree_checkout() {
  _dw_wt="$1"
  _dw_src="$2"

  if [ "${OPENTHROTTLE_WORKTREE_DEREGISTER:-1}" = "0" ]; then
    log "ℹ️  OPENTHROTTLE_WORKTREE_DEREGISTER=0 — leaving the OpenThrottle checkout record alone"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    log "ℹ️  curl not found — skipping OpenThrottle checkout deregistration"
    return 0
  fi
  if ! _dw_url=$(_ot_graphql_url "$_dw_src"); then
    log "ℹ️  no OpenThrottle endpoint configured — skipping checkout deregistration"
    return 0
  fi
  if ! _dw_token=$(_ot_auth_token "$_dw_src"); then
    log "ℹ️  no OpenThrottle token configured — skipping checkout deregistration"
    return 0
  fi

  # JSON-escape the only interpolated value; the rest of the body is a constant.
  _dw_path=$(printf '%s' "$_dw_wt" | sed 's/\\/\\\\/g; s/"/\\"/g')
  # The $input in the body is a GraphQL variable, not shell.
  # shellcheck disable=SC2016
  _dw_body=$(printf '{"query":"mutation DeregisterWorktreeCheckout($input: DeregisterWorktreeCheckoutInput!) { deregisterWorktreeCheckout(input: $input) { outcome } }","variables":{"input":{"filesystemPath":"%s"}}}' "$_dw_path")

  if ! _dw_response=$(curl -sS --max-time 5 -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $_dw_token" \
    --data "$_dw_body" "$_dw_url" 2>&1); then
    log "⚠️  could not reach OpenThrottle at $_dw_url to deregister this worktree; its record will show as missing until pruned"
    log "    $_dw_response"
    return 0
  fi

  _dw_outcome=$(printf '%s' "$_dw_response" | sed -n 's/.*"outcome"[[:space:]]*:[[:space:]]*"\([A-Z_]*\)".*/\1/p')
  case "$_dw_outcome" in
    PRUNED) log "🧹 removed the worktree's OpenThrottle checkout record" ;;
    NOT_FOUND) log "ℹ️  OpenThrottle had no checkout record for this worktree" ;;
    SKIPPED_ACTIVE_RUN) log "⚠️  OpenThrottle kept this worktree's record: a plan run that has not been settled still points at it" ;;
    "") log "⚠️  OpenThrottle did not deregister this worktree: $(printf '%s' "$_dw_response" | cut -c 1-300)" ;;
    *) log "ℹ️  OpenThrottle kept this worktree's record ($_dw_outcome)" ;;
  esac
  return 0
}
