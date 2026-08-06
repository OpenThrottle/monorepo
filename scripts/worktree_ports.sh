#!/usr/bin/env sh
#
# Deterministic per-worktree app-port allocation.
#
# Running OpenThrottle to build OpenThrottle means each worktree's dev servers
# (server/developer/...) would otherwise fight the ports the main checkout already
# binds. Worktrees are the "n": each gets its own coherent 10-port block in the
# 7000 range, derived from the worktree name so it is stable across re-setups,
# with a free-port bump to dodge the rare collision between two worktrees.
#
# Only the SIX app ports are offset. Postgres (6010) and Redis (6011) are left
# alone — worktrees share the main checkout's already-running database.
#
# Usage (source, do not exec):
#   . "$(dirname "$0")/worktree_ports.sh"
#   resolve_worktree_ports "<name>" "<worktree-dir>"   # worktree-dir optional
# Exports on success: OT_PORT_BASE and
#   OT_PORT_{DEVELOPER,SERVER,ADMIN,CMS,EMAIL,WEBSITE}.

# 6020..6026 in the canonical .env, in app order. The block preserves these
# relative offsets: developer=base+0, server=base+1, admin=+2, cms=+3, email=+4,
# website=+5, mcp=+6. Keep this list aligned with the rewrite map in setup_worktree.sh.
OT_PORT_CANONICAL="6020 6021 6022 6023 6024 6025 6026"

OT_PORT_BASE_MIN=7000   # first worktree block
OT_PORT_BLOCKS=50       # deterministic blocks 7000, 7010, ... 7490 (50 slots
                        # keeps hash collisions between worktrees rare)
OT_PORT_BLOCK_SIZE=10
OT_PORT_BASE_MAX=7990   # ceiling while bumping (7500-7990 = collision headroom)

# True (0) when a TCP port has a LISTENing socket on this host.
_ot_port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

# True (0) when every port in the 7-wide app block starting at $1 is free.
_ot_block_free() {
  _base=$1
  _p=$_base
  while [ "$_p" -le $((_base + 6)) ]; do
    if _ot_port_in_use "$_p"; then
      return 1
    fi
    _p=$((_p + 1))
  done
  return 0
}

resolve_worktree_ports() {
  _name=$1
  _wtree=${2:-}
  _cache=""
  [ -n "$_wtree" ] && _cache="$_wtree/.worktree-ports"

  _base=""

  # Reuse a previously resolved base so a worktree keeps the same ports across
  # re-setups (the deterministic hash already does this; the cache also pins the
  # value through a collision-bumped allocation).
  if [ -n "$_cache" ] && [ -f "$_cache" ]; then
    _base=$(sed -n 's/^OT_PORT_BASE=//p' "$_cache" 2>/dev/null | head -n1)
  fi

  if [ -z "$_base" ]; then
    # Deterministic slot from the worktree name (POSIX cksum CRC).
    _slot=$(printf '%s' "$_name" | cksum | cut -d' ' -f1)
    _base=$((OT_PORT_BASE_MIN + (_slot % OT_PORT_BLOCKS) * OT_PORT_BLOCK_SIZE))

    # Bump to the next block when this one is (partly) taken by another worktree.
    while ! _ot_block_free "$_base"; do
      _base=$((_base + OT_PORT_BLOCK_SIZE))
      if [ "$_base" -gt "$OT_PORT_BASE_MAX" ]; then
        echo "🔴 worktree_ports: no free app-port block in ${OT_PORT_BASE_MIN}-${OT_PORT_BASE_MAX}" >&2
        return 1
      fi
    done
  fi

  OT_PORT_BASE=$_base
  OT_PORT_DEVELOPER=$_base
  OT_PORT_SERVER=$((_base + 1))
  OT_PORT_ADMIN=$((_base + 2))
  OT_PORT_CMS=$((_base + 3))
  OT_PORT_EMAIL=$((_base + 4))
  OT_PORT_WEBSITE=$((_base + 5))
  OT_PORT_MCP=$((_base + 6))

  if [ -n "$_cache" ]; then
    printf 'OT_PORT_BASE=%s\n' "$_base" >"$_cache" 2>/dev/null || true
  fi

  export OT_PORT_BASE OT_PORT_DEVELOPER OT_PORT_SERVER OT_PORT_ADMIN \
    OT_PORT_CMS OT_PORT_EMAIL OT_PORT_WEBSITE OT_PORT_MCP
}
