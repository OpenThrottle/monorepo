#!/usr/bin/env sh
set -e

################################################################################
#
#   This script is meant to stitch together a few scripts for setup and
#   maintenance of the monorepo.
#
################################################################################

echo ""s
echo "🤖 setup.sh"
echo ""
echo "This script stitches together various scripts for both setup and day-to-day maintenance of the monorepo."
echo ""
echo "- setup_troubleshooting.sh"
echo "- setup_services.sh"
echo "- setup_environment.sh"
echo "- setup_software.sh"
echo ""

# 1. Run our troubleshooting script
./scripts/setup_troubleshooting.sh

# 2. Kick off the install/setup scripts
./scripts/setup_environment.sh
./scripts/setup_services.sh
./scripts/setup_software.sh

# 3. Run our build script once
pnpm build

# Echo we're done and the run command to start things up
echo ""
echo "✅ setup.sh"
echo ""
