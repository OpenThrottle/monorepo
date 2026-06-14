#!/usr/bin/env bash
#
# WorktreeCreate hook entrypoint.
#
# Contract (https://code.claude.com/docs/en/hooks.md):
#   - Receives the hook payload as JSON on stdin.
#   - Is responsible for CREATING the git worktree.
#   - MUST print ONLY the new worktree's absolute path on stdout.
#   - Any non-zero exit, or missing path, fails worktree creation.
#
# Everything except the final path goes to stderr so stdout stays clean.

set -euo pipefail

log() { printf '%s\n' "$*" >&2; }

# 1. Read the payload once (re-reading stdin yields nothing).
RAW="$(cat || true)"

# 2. Record the raw payload so we can verify the exact field names Claude sends.
#    Safe to delete once the name extraction below is confirmed.
PAYLOAD_LOG="${TMPDIR:-/tmp}/claude-worktree-payload.json"
printf '%s\n' "$RAW" >"$PAYLOAD_LOG" 2>/dev/null || true
log "🌳 WorktreeCreate payload logged to $PAYLOAD_LOG"

# 3. Resolve the repo root (prefer the payload's cwd, fall back to git).
REPO_ROOT="$(printf '%s' "$RAW" | jq -r '.cwd // empty' 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# 4. Resolve the worktree name. The docs don't pin down the field, so try the
#    likely candidates and fall back to a session-derived slug.
NAME="$(printf '%s' "$RAW" | jq -r '
  .name // .worktree_name // .worktreeName // .worktree // .branch // .slug // empty
' 2>/dev/null || true)"
if [ -z "$NAME" ]; then
  SID="$(printf '%s' "$RAW" | jq -r '.session_id // empty' 2>/dev/null || true)"
  NAME="wt-${SID:0:8}"
  [ "$NAME" = "wt-" ] && NAME="wt-$$"
  log "⚠️  No name field in payload; falling back to '$NAME' (see $PAYLOAD_LOG)"
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

# 5. Create the worktree. New branch by default; if the branch already exists,
#    check it out instead of failing.
if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  log "    (branch exists — checking it out)"
  git -C "$REPO_ROOT" worktree add "$WTREE" "$BRANCH" >&2
else
  git -C "$REPO_ROOT" worktree add -b "$BRANCH" "$WTREE" >&2
fi

# 6. Run the per-worktree setup INSIDE the new worktree. All output -> stderr,
#    stdin closed so any prompt takes its default instead of hanging the hook.
#    Set CLAUDE_WORKTREE_SETUP=0 to skip setup (smoke-testing the hook itself).
if [ "${CLAUDE_WORKTREE_SETUP:-1}" != "0" ]; then
  (
    cd "$WTREE"
    ./scripts/setup_worktree.sh </dev/null >&2
  )
else
  log "⏭️  CLAUDE_WORKTREE_SETUP=0 — skipping setup_worktree.sh"
fi

# 7. The ONLY thing on stdout: the worktree path.
printf '%s\n' "$WTREE"
