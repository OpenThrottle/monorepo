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
echo "- 🛟 setup_troubleshooting.sh"
echo "- 🔐 setup_environment.sh"
echo "- 💽 setup_software.sh"
echo ""

# 0. Setup our skills
./skills/ot-skill-sync/scripts/sync.sh

# 1. Run our troubleshooting script
./scripts/setup_troubleshooting.sh

# 2. Kick off the install/setup scripts
./scripts/setup_environment.sh
# ./scripts/setup_services.sh
./scripts/setup_software.sh

# 3. Run our build script once
pnpm run build

# 4. We need to determine if its the first run, if so...
pnpm run database:build
pnpm run database:start
pnpm run database:migrate

# 4a. We build some entries during initialization of the database.
pnpm run database:bootstrap-service-accounts
pnpm run database:import-agent-assets

# 4b. Seed the default local login user (FullThrottle2026!) so a freshly set-up
#     machine can log into the developer/admin apps without a manual out-of-band
#     step. Idempotent: an existing user keeps their password. This runs on the
#     primary checkout only (setup.sh is a primary-checkout script); worktrees
#     share this Postgres, so they inherit the seeded user and must NOT re-seed.
pnpm run database:bootstrap-default-user

# 4c. Fail loudly if any of the six required .bootstrap-secrets.local keys are
#     missing. This runs AFTER 4b because the service-account script writes the
#     2 token keys and the default-user script writes the 4 URL/user keys — only
#     here is the full set present. Guards against a silently dropped token.
pnpm run check:bootstrap-secrets

echo ""
echo ""
echo "----------------------------------------"
echo ""
echo "👀 👀 👀 setup.sh 👀 👀 👀"
echo ""
echo "Now copy 'OPENTHROTTLE_MCP_AUTH_TOKEN' and 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN'"
echo "from your local '.bootstrap-secrets.local' and replace the values in:"
echo ""
echo " - .env"
echo " - applications/openthrottle-server/.env"
echo ""
echo "And lastly follow run 'pnpm run setup:mcp-instructions' to get the"
echo "OpenThrottle MCP server installed globally."
echo ""
echo "----------------------------------------"
echo ""
