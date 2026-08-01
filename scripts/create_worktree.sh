#!/usr/bin/env bash
#
# The ONE way to create + provision an OpenThrottle git worktree, tool-agnostic.
#
# Invocation modes (auto-detected):
#   1. CLI / `pnpm worktree:new <name>`  — name passed as $1. Creates the worktree
#      and provisions it. No stdin is read.
#   2. Claude Code WorktreeCreate hook   — hook payload (JSON) arrives on stdin.
#      The name is parsed from the payload; the worktree is created + provisioned.
#   3. Provision-in-place                — no name arg and no stdin payload, run
#      from INSIDE an already-created linked worktree (e.g. Cursor, which creates
#      the worktree itself and then runs a setup command with cwd=$WORKTREE_PATH).
#      The current worktree is provisioned; no new worktree is created.
#
# Hook contract (https://code.claude.com/docs/en/hooks.md):
#   - MUST print ONLY the worktree's absolute path on stdout.
#   - Any non-zero exit, or missing path, fails worktree creation.
# Everything except the final path goes to stderr so stdout stays clean.

set -euo pipefail

log() { printf '%s\n' "$*" >&2; }

# True (0) when cwd is a LINKED worktree (not the primary checkout). Primary
# checkout: --git-dir and --git-common-dir resolve to the same path.
is_linked_worktree() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 1
  _gd=$(git rev-parse --git-dir 2>/dev/null) || return 1
  _gc=$(git rev-parse --git-common-dir 2>/dev/null) || return 1
  [ "$(cd "$_gd" && pwd -P)" != "$(cd "$_gc" && pwd -P)" ]
}

# Provision the worktree rooted at $1 by running setup_worktree.sh inside it.
# stdin is closed so any prompt takes its default instead of hanging.
# OT_SOURCE_REPO points setup at the primary checkout so real service-account
# tokens are copied into the worktree's reset-to-default .env files.
provision() {
  _wt="$1"
  _src="$2"
  if [ "${CLAUDE_WORKTREE_SETUP:-1}" = "0" ]; then
    log "⏭️  CLAUDE_WORKTREE_SETUP=0 — skipping setup_worktree.sh"
    return 0
  fi
  (
    cd "$_wt"
    OT_SOURCE_REPO="$_src" ./scripts/setup_worktree.sh </dev/null >&2
  )
}

# ---------------------------------------------------------------------------
# 0. Resolve invocation mode.
# ---------------------------------------------------------------------------
NAME="${1:-}"
RAW=""
# Only read stdin when there's no name arg AND stdin is a pipe (a payload). A TTY
# (interactive shell) or a name arg means there is no payload to read — never
# block on `cat`.
if [ -z "$NAME" ] && [ ! -t 0 ]; then
  RAW="$(cat || true)"
fi

# Mode 3: no name, no payload → provision the current worktree in place.
if [ -z "$NAME" ] && [ -z "$RAW" ]; then
  if is_linked_worktree; then
    WTREE="$(git rev-parse --show-toplevel)"
    # Primary checkout is the parent of the shared git common dir.
    SRC="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
    log "🌳 Provisioning existing worktree in place"
    log "    path:   $WTREE"
    provision "$WTREE" "$SRC"
    printf '%s\n' "$WTREE"
    exit 0
  fi
  log "🔴 create_worktree.sh: no worktree name given and not inside a linked worktree."
  log "    usage: pnpm worktree:new <name>   (or run inside a worktree to provision it)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Modes 1 & 2: create a new worktree.
# ---------------------------------------------------------------------------

# Record the raw hook payload so we can verify the exact field names Claude sends.
if [ -n "$RAW" ]; then
  PAYLOAD_LOG="${TMPDIR:-/tmp}/claude-worktree-payload.json"
  printf '%s\n' "$RAW" >"$PAYLOAD_LOG" 2>/dev/null || true
  log "🌳 WorktreeCreate payload logged to $PAYLOAD_LOG"
fi

# Resolve the repo root (prefer the payload's cwd, fall back to git).
REPO_ROOT="$(printf '%s' "$RAW" | jq -r '.cwd // empty' 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# Resolve the worktree name. From the arg in CLI mode; from the payload (trying
# the likely candidate fields) with a session-derived fallback in hook mode.
if [ -z "$NAME" ]; then
  NAME="$(printf '%s' "$RAW" | jq -r '
    .name // .worktree_name // .worktreeName // .worktree // .branch // .slug // empty
  ' 2>/dev/null || true)"
  if [ -z "$NAME" ]; then
    SID="$(printf '%s' "$RAW" | jq -r '.session_id // empty' 2>/dev/null || true)"
    NAME="wt-${SID:0:8}"
    [ "$NAME" = "wt-" ] && NAME="wt-$$"
    log "⚠️  No name field in payload; falling back to '$NAME' (see $PAYLOAD_LOG)"
  fi
fi

# Sanitize: strip any ref prefix and unsafe path characters.
NAME="${NAME##refs/heads/}"
NAME="$(printf '%s' "$NAME" | tr -c 'A-Za-z0-9._-' '-' | sed 's/^-*//; s/-*$//')"
[ -z "$NAME" ] && NAME="wt-$$"

BASE_DIR="$(dirname "$REPO_ROOT")/openthrottle-worktrees"
WTREE="$BASE_DIR/$NAME"
BRANCH="openthrottle/$NAME"

log "🌳 Creating worktree '$NAME'"
log "    repo:   $REPO_ROOT"
log "    path:   $WTREE"
log "    branch: $BRANCH"

mkdir -p "$BASE_DIR"

# Create the worktree. New branch by default; if the branch already exists,
# check it out instead of failing.
if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  log "    (branch exists — checking it out)"
  git -C "$REPO_ROOT" worktree add "$WTREE" "$BRANCH" >&2
else
  git -C "$REPO_ROOT" worktree add -b "$BRANCH" "$WTREE" >&2
fi

# Resolve a deterministic app-port block for this worktree and export it so
# setup_worktree.sh can rewrite the .env files (and pin it in the worktree's
# .worktree-ports cache, now that the directory exists).
# shellcheck source=scripts/worktree_ports.sh
. "$REPO_ROOT/scripts/worktree_ports.sh"
if resolve_worktree_ports "$NAME" "$WTREE"; then
  log "    ports:  app block ${OT_PORT_BASE}-$((OT_PORT_BASE + 5)) (developer ${OT_PORT_DEVELOPER}, server ${OT_PORT_SERVER})"
else
  log "⚠️  port allocation failed; worktree will use the default 6020-6025 block"
fi

# Run the per-worktree setup INSIDE the new worktree.
provision "$WTREE" "$REPO_ROOT"

# The ONLY thing on stdout: the worktree path.
printf '%s\n' "$WTREE"
