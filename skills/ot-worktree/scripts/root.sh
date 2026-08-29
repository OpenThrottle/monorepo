#!/usr/bin/env sh
#
# resolve_worktree_root — the single place that decides where worktrees live.
#
# This is mirrored in TypeScript by
# applications/openthrottle-server/src/services/worktree-root/worktree-root.resolver.ts
# (the server needs the same answer to discover worktrees). Change one, change both.
#
# Sourced, never executed. Requires log() from common.sh.

# Print the absolute directory THIS repo's worktrees are created in, on stdout;
# diagnostics on stderr.
#
# Two parts. First the ROOT — one directory holding every repo's worktrees:
#
#   1. OPENTHROTTLE_WORKTREE_ROOT in the environment.
#   2. OPENTHROTTLE_WORKTREE_ROOT in the target repo's .env — how a repo
#      customizes where ITS worktrees go. Same variable, read from the repo.
#   3. Default: $HOME/.openthrottle/worktrees. A hidden root OpenThrottle owns,
#      outside every repo so worktrees stay clear of the Nx workspace (daemon
#      watches, Vitest/knip/gitleaks globs, .gitignore). Mirrored in .env.default.
#
# Then OpenThrottle ALWAYS organizes beneath it, as <org>/<repo>:
#
#   ~/.openthrottle/worktrees/acme/monorepo/feature-x
#
# The root is a root, not a final destination — the same shape CHECKOUT_ROOT
# uses for clones. Organizing unconditionally is what makes the layout
# predictable: a configured root behaves exactly like the default one.
#
# The org comes from the repo's git remote, not its directory name. Two checkouts
# of different orgs' "monorepo" would otherwise land on one path, and by the time
# this runs git is unambiguously present — every action here shells out to it. A
# repo with no remote falls back to just <repo>, its directory name.
# Print "<org>/<repo>" for a checkout, or just "<repo>" when it has no usable
# remote. Segments are sanitized to [A-Za-z0-9._-] and "." / ".." are refused, so
# a hostile or malformed remote cannot walk out of the root.
_ot_repo_namespace() {
  _rn_repo="$1"
  _rn_base="$(_ot_safe_segment "$(basename "$_rn_repo")")"
  [ -n "$_rn_base" ] || _rn_base="repo"

  _rn_remote="$(git -C "$_rn_repo" remote get-url origin 2>/dev/null || true)"
  [ -n "$_rn_remote" ] || { printf '%s' "$_rn_base"; return 0; }

  # Strip a trailing .git, then take the last two path segments. Handles
  # https://host/org/repo.git, ssh://host/org/repo and git@host:org/repo.git.
  _rn_remote="${_rn_remote%.git}"
  _rn_remote="${_rn_remote%/}"
  _rn_repo_seg="$(_ot_safe_segment "${_rn_remote##*[/:]}")"
  _rn_rest="${_rn_remote%[/:]*}"
  _rn_org_seg="$(_ot_safe_segment "${_rn_rest##*[/:]}")"

  if [ -n "$_rn_org_seg" ] && [ -n "$_rn_repo_seg" ]; then
    printf '%s/%s' "$_rn_org_seg" "$_rn_repo_seg"
  elif [ -n "$_rn_repo_seg" ]; then
    printf '%s' "$_rn_repo_seg"
  else
    printf '%s' "$_rn_base"
  fi
}

# Reduce one path segment to [A-Za-z0-9._-]; empty for "." / ".." / nothing usable.
_ot_safe_segment() {
  _ss="$(printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '-')"
  _ss="${_ss#"${_ss%%[!-]*}"}"
  _ss="${_ss%"${_ss##*[!-]}"}"
  case "$_ss" in
    "" | "." | "..") printf '' ;;
    *) printf '%s' "$_ss" ;;
  esac
}

# Reduce a raw `.env` right-hand side to its value, the way dotenv does.
#
#   "~/wt" # where worktrees go   ->  ~/wt
#   ~/wt   # where worktrees go   ->  ~/wt
#
# A quoted value ends at its closing quote; everything after it is a comment. An
# unquoted value ends at the first " #". Without this a trailing comment becomes
# part of the path, and worktrees land in a directory literally named after it.
_ot_dotenv_value() {
  _dv="$1"
  case "$_dv" in
    '"'*)
      _dv="${_dv#\"}"
      _dv="${_dv%%\"*}"
      ;;
    "'"*)
      _dv="${_dv#\'}"
      _dv="${_dv%%\'*}"
      ;;
    *)
      case "$_dv" in
        *" #"* | *"	#"*) _dv="$(printf '%s' "$_dv" | sed 's/[[:space:]][[:space:]]*#.*$//')" ;;
      esac
      # Strip trailing whitespace left by an unquoted value.
      _dv="$(printf '%s' "$_dv" | sed 's/[[:space:]]*$//')"
      ;;
  esac
  printf '%s' "$_dv"
}

resolve_worktree_root() {
  _repo="$1"
  _root="${OPENTHROTTLE_WORKTREE_ROOT:-}"
  _from="OPENTHROTTLE_WORKTREE_ROOT env"

  if [ -z "$_root" ] && [ -f "$_repo/.env" ]; then
    # Last assignment wins, matching dotenv; strip CR, quotes and inline comments.
    _root="$(sed -n 's/^[[:space:]]*OPENTHROTTLE_WORKTREE_ROOT[[:space:]]*=[[:space:]]*//p' "$_repo/.env" | tail -n 1)"
    _root="${_root%$(printf '\r')}"
    _root="$(_ot_dotenv_value "$_root")"
    _from="$_repo/.env"
  fi

  if [ -z "$_root" ]; then
    _root="$HOME/.openthrottle/worktrees"
    _from="default (\$HOME/.openthrottle/worktrees)"
  fi

  case "$_root" in
    "~") _root="$HOME" ;;
    "~/"*) _root="$HOME/${_root#\~/}" ;;
  esac

  case "$_root" in
    /*) ;;
    *)
      log "🔴 worktree root must be an absolute path (got '$_root' from $_from)"
      return 1
      ;;
  esac

  # Strip trailing slashes (but never reduce "/" to "").
  while :; do
    case "$_root" in
      /) break ;;
      */) _root="${_root%/}" ;;
      *) break ;;
    esac
  done

  # OT always organizes beneath the root, whatever supplied it.
  _ns="$(_ot_repo_namespace "$_repo")"
  _root="$_root/$_ns"

  log "    root:   $_root  ($_from + $_ns)"
  printf '%s' "$_root"
}
