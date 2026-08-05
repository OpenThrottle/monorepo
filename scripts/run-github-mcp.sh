#!/usr/bin/env bash

# Run the GitHub MCP server (@modelcontextprotocol/server-github) on stdio, self-loading
# GITHUB_TOKEN from the repo's root .env when it isn't already exported in the launching
# shell.
#
# Why this wrapper exists: .mcp.json sets GITHUB_PERSONAL_ACCESS_TOKEN to "${GITHUB_TOKEN}".
# MCP clients only expand that when GITHUB_TOKEN is exported in the shell that launched the
# client. With no direnv/.envrc here, it usually isn't — so the client passes an empty or
# literal "${GITHUB_TOKEN}" through and every GitHub API call 401s. Reading the token from
# .env here (the same pattern as run-openthrottle-mcp.sh) makes the server work regardless
# of the launching shell. See scripts/run-openthrottle-mcp.sh for the sibling OT case.
set -e

log() { echo "$@" > /dev/stderr; }

cd "$(dirname "$0")/.."

# Read one var from an env file WITHOUT sourcing it (no side effects; a missing .env must
# never abort the launcher). Strips surrounding single/double quotes.
read_env_var() {
  [ -f "$1" ] || return 1
  grep -E "^${2}=" "$1" | tail -n1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"
}

# Prefer this checkout's root .env, falling back to the main/root checkout's .env (the git
# common dir is <main>/.git even from a linked worktree, so its parent is the main checkout).
resolve_from_env() {
  local var="$1" val
  val=$(read_env_var "./.env" "$var") && [ -n "$val" ] && { printf '%s' "$val"; return 0; }
  local common_dir root_repo
  common_dir=$(git rev-parse --git-common-dir 2>/dev/null || true)
  if [ -n "$common_dir" ]; then
    root_repo=$(cd "$(dirname "$common_dir")" 2>/dev/null && pwd || true)
    if [ -n "$root_repo" ]; then
      val=$(read_env_var "$root_repo/.env" "$var") && [ -n "$val" ] && { printf '%s' "$val"; return 0; }
    fi
  fi
  return 1
}

# Treat a missing OR unexpanded "${...}" placeholder as unset, then self-load from .env.
case "${GITHUB_TOKEN:-}" in *'${'*) unset -v GITHUB_TOKEN ;; esac
if [ -z "${GITHUB_TOKEN:-}" ]; then
  if tok=$(resolve_from_env GITHUB_TOKEN); then
    export GITHUB_TOKEN="$tok"
  fi
fi

# The server reads GITHUB_PERSONAL_ACCESS_TOKEN; mirror the same unexpanded-placeholder
# guard and backfill it from GITHUB_TOKEN.
case "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" in *'${'*) unset -v GITHUB_PERSONAL_ACCESS_TOKEN ;; esac
if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ] && [ -n "${GITHUB_TOKEN:-}" ]; then
  export GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN"
fi

if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
  log "⚠️  run-github-mcp: no GITHUB_TOKEN found (shell env or .env). GitHub API calls will 401."
fi

exec npx -y @modelcontextprotocol/server-github
