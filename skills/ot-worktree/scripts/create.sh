#!/usr/bin/env bash
#
# ot-worktree: CREATE — the one way to create + provision a git worktree.
#
# Invocation modes (auto-detected):
#   1. CLI / `pnpm worktree:new <name>`  — name passed as $1. Creates the
#      worktree and provisions it. No stdin is read.
#   2. Claude Code WorktreeCreate hook   — hook payload (JSON) arrives on stdin.
#      The name is parsed from the payload; the worktree is created + provisioned.
#   3. Provision-in-place                — no name arg and no stdin payload, run
#      from INSIDE an already-created linked worktree (e.g. Cursor, which creates
#      the worktree itself and then runs a setup command with cwd=$WORKTREE_PATH).
#      The current worktree is provisioned; no new worktree is created.
#
# Base branch — the ref a NEW branch forks from, highest rung wins:
#   1. `--base <ref>` / $OPENTHROTTLE_WORKTREE_BASE  — explicit (use `HEAD` to fork
#      from whatever the primary checkout is on, e.g. to stack on current work).
#   2. The remote's default branch, via refs/remotes/<remote>/HEAD. This is the
#      default so a fresh worktree never silently inherits local work in progress.
#   3. HEAD, when there is no remote default to resolve.
# No fetch is performed: rung 2 is the last-fetched ref, so create stays fast and
# works offline. Pull inside the worktree if you need newer than your last fetch.
#
# Hook contract (https://code.claude.com/docs/en/hooks.md):
#   - MUST print ONLY the worktree's absolute path on stdout.
#   - Any non-zero exit, or missing path, fails worktree creation.
# Everything except the final path goes to stderr so stdout stays clean.

set -euo pipefail

OPENTHROTTLE_WORKTREE_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
# shellcheck source=skills/ot-worktree/scripts/common.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/common.sh"
# shellcheck source=skills/ot-worktree/scripts/root.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/root.sh"
# shellcheck source=skills/ot-worktree/scripts/provision.sh
. "$OPENTHROTTLE_WORKTREE_SCRIPT_DIR/provision.sh"

# Resolve the ref a new branch forks from. See the base-branch ladder up top.
# Prints the ref on stdout; returns 1 only when an EXPLICIT base does not resolve
# (a bad --base is a typo worth failing on, never something to silently ignore).
resolve_base_ref() {
  _rb_repo="$1"
  _rb_explicit="${2:-}"

  if [ -n "$_rb_explicit" ]; then
    if ! git -C "$_rb_repo" rev-parse --verify --quiet "$_rb_explicit^{commit}" >/dev/null 2>&1; then
      log "🔴 base ref '$_rb_explicit' does not resolve in $_rb_repo"
      return 1
    fi
    printf '%s' "$_rb_explicit"
    return 0
  fi

  # The remote's default branch. Same remote convention as the org segment in
  # root.sh, so the two cannot disagree about which remote is canonical.
  _rb_remote="${OPENTHROTTLE_WORKTREE_REMOTE:-origin}"
  _rb_head="$(git -C "$_rb_repo" symbolic-ref --quiet "refs/remotes/$_rb_remote/HEAD" 2>/dev/null || true)"
  if [ -n "$_rb_head" ]; then
    _rb_head="${_rb_head#refs/remotes/}"
    if git -C "$_rb_repo" rev-parse --verify --quiet "$_rb_head^{commit}" >/dev/null 2>&1; then
      printf '%s' "$_rb_head"
      return 0
    fi
  fi

  # refs/remotes/<remote>/HEAD is absent on clones made before the remote had
  # commits, and on plenty of older clones generally. `git remote set-head -a`
  # would repair it, but that needs the network and create does not fetch — so
  # fall back to the conventional default-branch names, resolved purely locally.
  for _rb_guess in main master; do
    if git -C "$_rb_repo" rev-parse --verify --quiet \
      "refs/remotes/$_rb_remote/$_rb_guess^{commit}" >/dev/null 2>&1; then
      printf '%s' "$_rb_remote/$_rb_guess"
      return 0
    fi
  done

  # Nothing resolvable: no remote, or a remote whose default we cannot name.
  printf '%s' "HEAD"
}

# ---------------------------------------------------------------------------
# 0. Resolve invocation mode.
# ---------------------------------------------------------------------------
NAME=""
BASE_OVERRIDE="${OPENTHROTTLE_WORKTREE_BASE:-}"
BASE_EXPLICIT=0
[ -n "$BASE_OVERRIDE" ] && BASE_EXPLICIT=1
while [ $# -gt 0 ]; do
  case "$1" in
    --base)
      shift
      [ $# -gt 0 ] || { log "🔴 --base requires a ref (e.g. --base main)"; exit 1; }
      BASE_OVERRIDE="$1"; BASE_EXPLICIT=1
      ;;
    --base=*) BASE_OVERRIDE="${1#--base=}"; BASE_EXPLICIT=1 ;;
    --) ;;
    -*) log "🔴 unknown option: $1"; exit 1 ;;
    *)
      if [ -z "$NAME" ]; then NAME="$1"; else
        log "🔴 unexpected argument: $1"; exit 1
      fi
      ;;
  esac
  shift
done
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
    [ "$BASE_EXPLICIT" -eq 1 ] && log "⚠️  --base ignored: provisioning an existing worktree in place."
    WTREE="$(git rev-parse --show-toplevel)"
    SRC="$(primary_checkout)"
    log "🌳 Provisioning existing worktree in place"
    log "    path:   $WTREE"
    provision_worktree "$WTREE" "$SRC"
    worktree_mark_provisioned "$WTREE"
    printf '%s\n' "$WTREE"
    exit 0
  fi
  log "🔴 ot-worktree create: no worktree name given and not inside a linked worktree."
  log "    usage: pnpm worktree:new <name> [--base <ref>]"
  log "           (or run inside a worktree to provision it)"
  exit 1
fi

# ---------------------------------------------------------------------------
# Modes 1 & 2: create a new worktree.
# ---------------------------------------------------------------------------

# Record the raw hook payload so the exact field names a tool sends stay visible.
PAYLOAD_LOG=""
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
# Always create from the primary checkout, even when invoked inside a worktree.
REPO_ROOT="$(primary_checkout "$REPO_ROOT" || printf '%s' "$REPO_ROOT")"

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

NAME="$(sanitize_worktree_name "$NAME")"

BASE_DIR="$(resolve_worktree_root "$REPO_ROOT")"
WTREE="$BASE_DIR/$NAME"
BRANCH="${OPENTHROTTLE_WORKTREE_BRANCH_PREFIX-openthrottle/}$NAME"

BASE_REF="$(resolve_base_ref "$REPO_ROOT" "$BASE_OVERRIDE")" || exit 1

log "🌳 Creating worktree '$NAME'"
log "    repo:   $REPO_ROOT"
log "    path:   $WTREE"
log "    branch: $BRANCH"
log "    base:   $BASE_REF"

mkdir -p "$BASE_DIR"

# Create the worktree. New branch by default; if the branch already exists,
# check it out instead of failing.
if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  [ "$BASE_EXPLICIT" -eq 1 ] && log "⚠️  --base ignored: branch '$BRANCH' already exists."
  log "    (branch exists — checking it out)"
  git -C "$REPO_ROOT" worktree add "$WTREE" "$BRANCH" >&2
else
  # --no-track: forking from a remote-tracking ref like origin/main would otherwise
  # set main as this branch's upstream, aiming a later push at the wrong branch.
  git -C "$REPO_ROOT" worktree add --no-track -b "$BRANCH" "$WTREE" "$BASE_REF" >&2
fi

# Hand off to the repo's provisioner (or no-op when the repo has none), then
# mark the worktree provisioned so heal.sh stays a no-op on it.
provision_worktree "$WTREE" "$REPO_ROOT"
worktree_mark_provisioned "$WTREE"

# The ONLY thing on stdout: the worktree path.
printf '%s\n' "$WTREE"
