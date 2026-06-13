#!/usr/bin/env sh
set -e

# 0. Assume the basics if you're kicking off a worktree

# 1. Create the environment file(s) — resets each .env to .env.default (6020-6025).
./scripts/setup_environment.sh

# 1b. Offset this worktree's six app ports so concurrent worktrees don't fight
#     the main checkout's dev servers. Postgres/Redis stay shared (untouched).
#     create_worktree.sh exports OT_PORT_* before calling us; resolve here too
#     so a standalone `setup_worktree.sh` run still gets a block.
# shellcheck source=scripts/worktree_ports.sh
. ./scripts/worktree_ports.sh
if [ -z "${OT_PORT_BASE:-}" ]; then
  resolve_worktree_ports "$(basename "$PWD")" "$PWD" || true
fi

# Remap the canonical app ports (6020..6025) onto this worktree's block across
# every .env. The 70xx targets never overlap the 60xx sources, so one perl pass
# is internally consistent and idempotent (a re-run finds no 602x left). Exact
# \b matches leave Postgres/Redis (6010/6011) and comment numbers (6012,
# 604800000) alone.
rewrite_worktree_ports() {
  _prog="s/\\b6020\\b/${OT_PORT_DEVELOPER}/g;"
  _prog="${_prog}s/\\b6021\\b/${OT_PORT_SERVER}/g;"
  _prog="${_prog}s/\\b6022\\b/${OT_PORT_ADMIN}/g;"
  _prog="${_prog}s/\\b6023\\b/${OT_PORT_CMS}/g;"
  _prog="${_prog}s/\\b6024\\b/${OT_PORT_EMAIL}/g;"
  _prog="${_prog}s/\\b6025\\b/${OT_PORT_WEBSITE}/g;"
  for _f in .env applications/*/.env; do
    [ -f "$_f" ] || continue
    perl -i -pe "$_prog" "$_f"
  done
}

if [ -n "${OT_PORT_BASE:-}" ] && [ "$OT_PORT_BASE" != "6020" ]; then
  rewrite_worktree_ports
  echo "🔌 worktree app ports → block ${OT_PORT_BASE}-$((OT_PORT_BASE + 5))"
fi

# 2. Install the dependencies
pnpm install

# 3. Build our packages
pnpm build

# 4. Echo we're done
echo "🌳 worktree setup complete 🌳"
echo "   - path: $PWD"
if [ -n "${OT_PORT_BASE:-}" ] && [ "$OT_PORT_BASE" != "6020" ]; then
  echo "   - developer: http://localhost:${OT_PORT_DEVELOPER}"
  echo "   - server:    http://localhost:${OT_PORT_SERVER}"
fi
echo ""
