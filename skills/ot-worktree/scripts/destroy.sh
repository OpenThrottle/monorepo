#!/usr/bin/env bash
#
# ot-worktree: DESTROY — tear down and remove a git worktree.
#
# Invocation modes (mirroring create.sh, so the three actions feel like one tool):
#   1. `destroy.sh <name>`   — resolved to <worktree-root>/<name> via the same
#                              root ladder create.sh used to place it.
#   2. `destroy.sh <path>`   — an absolute path to a worktree.
#   3. `destroy.sh`          — no args, run from INSIDE a linked worktree:
#                              self-removal (we chdir to the primary checkout
#                              first, since you cannot delete the directory you
#                              are standing in).
#
# Flags:
#   --dry-run         print exactly what would happen; remove nothing.
#   --force           remove despite a dirty worktree / delete an unmerged branch.
#   --delete-branch   also delete the worktree's branch (merged only, unless --force).
#
# Safety: the target must be a registered LINKED worktree of this repo. The
# primary checkout is refused outright. A dirty worktree is refused without
# --force. The branch is left alone unless asked for.

set -euo pipefail

OPENTHROTTLE_WORKTREE_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
# shellcheck source=skills/ot-worktree/scripts/common.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/common.sh"
# shellcheck source=skills/ot-worktree/scripts/root.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/root.sh"
# shellcheck source=skills/ot-worktree/scripts/provision.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/provision.sh"

DRY_RUN=0
FORCE=0
DELETE_BRANCH=0
TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --force | -f) FORCE=1 ;;
    --delete-branch) DELETE_BRANCH=1 ;;
    -*)
      log "🔴 ot-worktree destroy: unknown flag '$1'"
      exit 1
      ;;
    *)
      if [ -n "$TARGET" ]; then
        log "🔴 ot-worktree destroy: more than one target given ('$TARGET', '$1')"
        exit 1
      fi
      TARGET="$1"
      ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# 1. Resolve the primary checkout and the worktree to remove.
# ---------------------------------------------------------------------------
SRC="$(primary_checkout || true)"
if [ -z "$SRC" ]; then
  log "🔴 ot-worktree destroy: not inside a git repository."
  exit 1
fi

if [ -z "$TARGET" ]; then
  # Mode 3: self-removal.
  if ! is_linked_worktree; then
    log "🔴 ot-worktree destroy: no target given and not inside a linked worktree."
    log "    usage: pnpm worktree:remove <name|path> [--dry-run] [--force] [--delete-branch]"
    exit 1
  fi
  WTREE="$(git rev-parse --show-toplevel)"
  log "🌳 self-removal: target is the current worktree"
else
  case "$TARGET" in
    /*) WTREE="$TARGET" ;;
    *)
      BASE_DIR="$(resolve_worktree_root "$SRC")"
      WTREE="$BASE_DIR/$(sanitize_worktree_name "$TARGET")"
      ;;
  esac
fi

# Canonicalize; a non-existent path can still be a registered-but-missing
# worktree, so fall back to the literal path rather than failing here.
WTREE_RESOLVED="$WTREE"
WTREE="$(abs_dir "$WTREE" || true)"
[ -n "$WTREE" ] || WTREE="$WTREE_RESOLVED"

# ---------------------------------------------------------------------------
# 2. Guards. Never guess: the target must be a registered linked worktree.
# ---------------------------------------------------------------------------
if ! is_registered_worktree "$SRC" "$WTREE"; then
  log "🔴 ot-worktree destroy: '$WTREE' is not a registered linked worktree of $SRC"
  log "    refusing to remove anything. Registered worktrees:"
  git -C "$SRC" worktree list >&2 || true
  exit 1
fi

NAME="$(basename "$WTREE")"
BRANCH="$(git -C "$WTREE" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
DIRTY="$(git -C "$WTREE" status --short 2>/dev/null || true)"

log "🪓 Removing worktree '$NAME'"
log "    repo:   $SRC"
log "    path:   $WTREE"
log "    branch: ${BRANCH:-(detached)}"

if [ -n "$DIRTY" ] && [ "$FORCE" != "1" ] && [ "$DRY_RUN" != "1" ]; then
  log "🔴 worktree has uncommitted changes — refusing to remove it:"
  printf '%s\n' "$DIRTY" >&2
  log "    commit/stash them, or re-run with --force to discard them."
  exit 1
fi

if [ "$DRY_RUN" = "1" ]; then
  log "🧪 --dry-run: nothing will be removed."
  [ -n "$DIRTY" ] && log "    note: worktree is dirty; a real run needs --force."
  log "    would run the teardown hook (if any), then: git worktree remove"
  [ "$FORCE" = "1" ] && log "    would pass --force to git worktree remove"
  [ "$DELETE_BRANCH" = "1" ] && log "    would delete branch '${BRANCH:-(detached)}'"
  log "    would run: git worktree prune"
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. Teardown BEFORE removal. A failing teardown aborts — this is where a repo
#    stops a container or releases a port lease; removing anyway would leak it.
# ---------------------------------------------------------------------------
if ! teardown_worktree "$WTREE" "$SRC"; then
  log "🔴 teardown hook failed — leaving the worktree in place."
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Remove. Run from the primary checkout so self-removal works.
# ---------------------------------------------------------------------------
cd "$SRC"

if [ "$FORCE" = "1" ]; then
  git -C "$SRC" worktree remove --force "$WTREE" >&2
else
  git -C "$SRC" worktree remove "$WTREE" >&2
fi

git -C "$SRC" worktree prune >&2

if [ "$DELETE_BRANCH" = "1" ] && [ -n "$BRANCH" ] && [ "$BRANCH" != "HEAD" ]; then
  if [ "$FORCE" = "1" ]; then
    git -C "$SRC" branch -D "$BRANCH" >&2
  elif git -C "$SRC" branch -d "$BRANCH" >&2; then
    :
  else
    log "⚠️  branch '$BRANCH' is not fully merged — kept it."
    log "    re-run with --delete-branch --force to delete it anyway."
  fi
fi

log "✅ removed worktree '$NAME'"
