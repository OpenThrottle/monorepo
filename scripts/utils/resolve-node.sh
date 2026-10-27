# shellcheck shell=bash
#
# Pick a Node that satisfies the root package.json `engines.node`, for
# scripts/run-openthrottle-mcp.sh. Sourced, not executed.
#
# Why it exists: MCP clients spawn the launcher with whatever PATH they built,
# and that PATH is often not the repo's Node. The Claude desktop app lists
# every nvm install in ascending order, so `node` is the OLDEST one (v16 lacks
# a global `fetch`, which the launcher then misreports as "no reachable
# server"); `env -i` has no `node` at all. So the shim chooses a Node itself.
#
# Order tried, first hit wins (decision + timings: OT plan 426acb9a):
#   0. $OT_MCP_NODE — an explicit node binary. Explicit means explicit: if it
#      does not satisfy engines, resolution fails rather than falling through.
#   1. $NVM_DIR/versions/node/v<.nvmrc> — this checkout's .nvmrc, else the
#      primary checkout's (worktree fallback, same as tsx). Only a full
#      x.y.z .nvmrc is looked up; aliases (lts/*, node) and partials skip on.
#   2. The newest $NVM_DIR/versions/node/v* that satisfies engines.
#   3. The `node` on PATH, if its --version satisfies engines.
#
# Resolution never sources nvm.sh (~210 ms, and `nvm use` prints to stdout)
# and never spawns node to choose a node, except to ask an explicit or PATH
# node its version. It writes NOTHING to stdout: results come back in globals.
#
# The range grammar deliberately matches scripts/check-node-engine.mjs
# (`||`-separated alternatives of space-separated `>= > <= < =` comparators);
# scripts/__tests__/run-openthrottle-mcp.test.ts holds the two in agreement.
#
# Must stay bash 3.2-compatible (macOS /bin/bash) and safe under `set -eu`.

# Parse `major[.minor[.patch]]` (optional leading v) off the front of $1 into
# _OT_V1 _OT_V2 _OT_V3. Returns 1 when $1 does not start with a number.
_ot_node_parse() {
  local rest=${1#v} major minor=0 patch=0

  major=${rest%%[!0-9]*}
  [ -n "$major" ] || return 1
  rest=${rest#"$major"}

  case $rest in
    .[0-9]*)
      rest=${rest#.}
      minor=${rest%%[!0-9]*}
      rest=${rest#"$minor"}
      case $rest in
        .[0-9]*)
          rest=${rest#.}
          patch=${rest%%[!0-9]*}
          ;;
      esac
      ;;
  esac

  _OT_V1=$((10#$major))
  _OT_V2=$((10#$minor))
  _OT_V3=$((10#$patch))
}

# Compare a.b.c ($1 $2 $3) against x.y.z ($4 $5 $6); sets _OT_ORDER to -1, 0 or 1.
_ot_node_compare() {
  _OT_ORDER=0
  if [ "$1" -ne "$4" ]; then
    [ "$1" -lt "$4" ] && _OT_ORDER=-1 || _OT_ORDER=1
  elif [ "$2" -ne "$5" ]; then
    [ "$2" -lt "$5" ] && _OT_ORDER=-1 || _OT_ORDER=1
  elif [ "$3" -ne "$6" ]; then
    [ "$3" -lt "$6" ] && _OT_ORDER=-1 || _OT_ORDER=1
  fi
}

# ot_node_satisfies VERSION RANGE — 0 if VERSION satisfies RANGE, 1 if not,
# 2 if either cannot be parsed (a range we cannot read is reported, never passed).
ot_node_satisfies() {
  local v1 v2 v3 rest alternative comparator operator all_true
  _ot_node_parse "$1" || return 2
  v1=$_OT_V1 v2=$_OT_V2 v3=$_OT_V3

  rest=$2
  while :; do
    alternative=${rest%%||*}
    all_true=''

    set -f
    for comparator in $alternative; do
      case $comparator in
        '>='*) operator='>=' ;;
        '<='*) operator='<=' ;;
        '>'*) operator='>' ;;
        '<'*) operator='<' ;;
        '='*) operator='=' ;;
        *) operator='' ;;
      esac
      if ! _ot_node_parse "${comparator#"$operator"}"; then
        set +f
        return 2
      fi
      _ot_node_compare "$v1" "$v2" "$v3" "$_OT_V1" "$_OT_V2" "$_OT_V3"
      [ -n "$all_true" ] || all_true=yes
      case $operator in
        '>=') [ "$_OT_ORDER" -ge 0 ] || all_true=no ;;
        '>') [ "$_OT_ORDER" -gt 0 ] || all_true=no ;;
        '<=') [ "$_OT_ORDER" -le 0 ] || all_true=no ;;
        '<') [ "$_OT_ORDER" -lt 0 ] || all_true=no ;;
        *) [ "$_OT_ORDER" -eq 0 ] || all_true=no ;;
      esac
    done
    set +f

    [ "$all_true" = yes ] && return 0
    [ "$alternative" = "$rest" ] && return 1
    rest=${rest#*||}
  done
}

# Read `engines.node` out of package.json $1 into OT_NODE_RANGE, without jq or
# a node: walk lines until the "node" key inside the "engines" object.
_ot_node_read_engines() {
  local line in_engines=''
  OT_NODE_RANGE=''
  [ -f "$1" ] || return 1

  while IFS= read -r line || [ -n "$line" ]; do
    case $line in *'"engines"'*) in_engines=yes ;; esac
    [ -n "$in_engines" ] || continue
    case $line in
      *'"node"'*:*)
        line=${line#*'"node"'}
        line=${line#*:}
        line=${line#*'"'}
        OT_NODE_RANGE=${line%%'"'*}
        break
        ;;
      *'}'*) in_engines='' ;;
    esac
  done <"$1"

  [ -n "$OT_NODE_RANGE" ]
}

# Ask node binary $1 its version and accept it if it satisfies engines.
_ot_node_try_binary() {
  local version
  version=$("$1" --version 2>/dev/null) || version=''
  if [ -n "$version" ] && ot_node_satisfies "$version" "$OT_NODE_RANGE"; then
    OT_NODE_BIN=${1%/*}
    OT_NODE_VERSION=$version
    return 0
  fi
  _ot_node_tried "$2 ${version:-unknown}"
  return 1
}

_ot_node_tried() {
  OT_NODE_TRIED="${OT_NODE_TRIED:+$OT_NODE_TRIED; }$1"
}

# ot_resolve_node CHECKOUT_DIR [PRIMARY_DIR]
#
# On success (0): OT_NODE_BIN is the chosen node's bin directory and
# OT_NODE_VERSION its version. On failure (1): OT_NODE_TRIED says what was
# tried and why each was rejected. OT_NODE_RANGE is set either way.
ot_resolve_node() {
  local checkout=$1 primary=${2:-} nvm_dir=${NVM_DIR:-${HOME:-}/.nvm}
  local wanted='' dir best='' b1=0 b2=0 b3=0 installed=0 path_node explicit
  OT_NODE_BIN='' OT_NODE_VERSION='' OT_NODE_TRIED=''

  if ! _ot_node_read_engines "$checkout/package.json"; then
    _ot_node_tried "no engines.node in $checkout/package.json"
    return 1
  fi

  # 0. Explicit override. A literal ${...} is a client that could not expand
  # its env block — treat it as unset, like the .ts does for the auth token.
  explicit=${OT_MCP_NODE:-}
  case $explicit in *'${'*) explicit='' ;; esac
  if [ -n "$explicit" ]; then
    if [ -x "$explicit" ] && [ ! -d "$explicit" ]; then
      _ot_node_try_binary "$explicit" "OT_MCP_NODE=$explicit"
      return
    fi
    _ot_node_tried "OT_MCP_NODE=$explicit (not an executable file)"
    return 1
  fi

  # 1. The exact .nvmrc version.
  if [ -f "$checkout/.nvmrc" ]; then
    read -r wanted <"$checkout/.nvmrc" || true
  elif [ -n "$primary" ] && [ -f "$primary/.nvmrc" ]; then
    read -r wanted <"$primary/.nvmrc" || true
  fi
  wanted=${wanted%$'\r'}
  wanted=${wanted#v}
  case $wanted in
    '') ;;
    *[!0-9.]* | *..* | .* | *. | *.*.*.*)
      _ot_node_tried ".nvmrc '$wanted' (not an exact x.y.z)"
      ;;
    *.*.*)
      if ! [ -x "$nvm_dir/versions/node/v$wanted/bin/node" ]; then
        _ot_node_tried ".nvmrc v$wanted (not installed in $nvm_dir)"
      elif ! ot_node_satisfies "$wanted" "$OT_NODE_RANGE"; then
        _ot_node_tried ".nvmrc v$wanted (outside engines)"
      else
        OT_NODE_BIN=$nvm_dir/versions/node/v$wanted/bin
        OT_NODE_VERSION=v$wanted
        return 0
      fi
      ;;
    *) _ot_node_tried ".nvmrc '$wanted' (not an exact x.y.z)" ;;
  esac

  # 2. The newest installed nvm version that satisfies engines.
  for dir in "$nvm_dir"/versions/node/v*; do
    [ -x "$dir/bin/node" ] || continue
    installed=$((installed + 1))
    ot_node_satisfies "${dir##*/}" "$OT_NODE_RANGE" || continue
    _ot_node_parse "${dir##*/}"
    _ot_node_compare "$_OT_V1" "$_OT_V2" "$_OT_V3" "$b1" "$b2" "$b3"
    if [ -z "$best" ] || [ "$_OT_ORDER" -gt 0 ]; then
      best=$dir b1=$_OT_V1 b2=$_OT_V2 b3=$_OT_V3
    fi
  done
  if [ -n "$best" ]; then
    OT_NODE_BIN=$best/bin
    OT_NODE_VERSION=${best##*/}
    return 0
  fi
  _ot_node_tried "none of $installed nvm installs in $nvm_dir"

  # 3. Whatever `node` is on PATH.
  path_node=$(command -v node 2>/dev/null) || path_node=''
  if [ -n "$path_node" ]; then
    _ot_node_try_binary "$path_node" "PATH node $path_node"
    return
  fi
  _ot_node_tried "no node on PATH"
  return 1
}
