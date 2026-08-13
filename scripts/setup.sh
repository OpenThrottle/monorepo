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

# 0. Setup our skills
./skills/skill-sync/scripts/sync.sh

# 1. Run our troubleshooting script
./scripts/setup_troubleshooting.sh

# 2. Kick off the install/setup scripts
./scripts/setup_environment.sh
./scripts/setup_services.sh
./scripts/setup_software.sh

# 3. Run our build script once
pnpm build

# 4. We need to determine if its the first run, if so...
pnpm database:build
pnpm database:start
pnpm database:migrate
pnpm database:bootstrap-service-accounts

# 4b. Seed the default local login user (FullThrottle2026!) so a freshly set-up
#     machine can log into the developer/admin apps without a manual out-of-band
#     step. Idempotent: an existing user keeps their password. This runs on the
#     primary checkout only (setup.sh is a primary-checkout script); worktrees
#     share this Postgres, so they inherit the seeded user and must NOT re-seed.
pnpm database:bootstrap-default-user

# 4c. Fail loudly if any of the six required .bootstrap-secrets.local keys are
#     missing. This runs AFTER 4b because the service-account script writes the
#     2 token keys and the default-user script writes the 4 URL/user keys — only
#     here is the full set present. Guards against a silently dropped token.
pnpm check:bootstrap-secrets

echo "🤖 setup.sh complete: run "

# Echo we're done and the run command to start things up
echo ""
echo "✅ setup.sh"
echo ""
