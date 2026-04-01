#!/usr/bin/env sh
set -e

################################################################################
#
#   This script is meant to stitch together a few scripts for setup and
#   maintenance of the monorepo.
#
################################################################################

echo ""
echo "🤖 setup.sh"
echo ""
echo "This script stitches together various scripts for both setup and day-to-day maintenance of the monorepo."
echo ""
echo "- setup-troubleshooting.sh"
echo "- setup-clone-repos.sh"
echo "- setup-environment.sh"
echo "- setup-install-software.sh"
echo ""

# 1. We re-use the troubleshooting script from the "shiftsmart" repository
./scripts/setup-troubleshooting.sh

# 2. Kick off the install/setup scripts
./scripts/setup-clone-repos.sh
./scripts/setup-environment.sh
./scripts/setup-install-software.sh

# 3. Run our build script once
pnpm build

# Echo we're done and the run command to start things up
echo ""
echo "✅ setup.sh"
echo ""
