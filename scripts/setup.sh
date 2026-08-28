#!/usr/bin/env sh
#
# Pre-install bootstrap for the primary checkout. This shim stays POSIX
# because everything in it must work BEFORE node_modules exists: it checks
# the toolchain, syncs skills, activates pnpm and installs — then hands off
# to `tsx ./scripts/setup.ts` for the post-install orchestration (build,
# database, bootstrap, secrets check).

set -eu

echo ""
echo "🤖 setup.sh — pre-install bootstrap, then tsx ./scripts/setup.ts"
echo ""

# ─── Toolchain preflight (the old setup_troubleshooting.sh checks) ──────────
# node/pnpm/nx installed via brew fight the per-project versions the monorepo
# pins; nx and pnpm from brew are known breakers, node/npm are warnings.
HAS_BLOCKING_ISSUES=false

check_brew_package() {
  if command -v brew >/dev/null 2>&1 && brew ls --versions "$1" >/dev/null 2>&1; then
    if [ "${2:-false}" = true ]; then
      echo "🚨 \"$1\" is installed via brew — this will MOST LIKELY break the monorepo."
      echo "   Fix: brew uninstall $1  (then re-run this script)"
      HAS_BLOCKING_ISSUES=true
    else
      echo "⚠️  \"$1\" is installed via brew — this MAY cause issues with the monorepo."
    fi
  else
    echo "👌 \"$1\" is not installed via brew"
  fi
}

check_brew_package "node"
check_brew_package "nx" true
check_brew_package "npm"
check_brew_package "pnpm" true

if [ "$HAS_BLOCKING_ISSUES" = true ]; then
  echo ""
  echo "🔴 Fix the blocking issues above and run ./scripts/setup.sh again."
  exit 1
fi

# ─── Skills (pre-install by design — owned by ot-skill-sync) ────────────────
./skills/ot-skill-sync/scripts/sync.sh

# ─── Package manager + dependencies (the old setup_software.sh) ─────────────
corepack enable pnpm
corepack prepare --activate
pnpm install

# ─── Everything else is TypeScript ──────────────────────────────────────────
exec ./node_modules/.bin/tsx ./scripts/setup.ts "$@"
