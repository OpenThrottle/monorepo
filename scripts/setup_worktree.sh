#!/usr/bin/env sh
set -e

# 0. Assume the basics if you're kicking off a worktree

# 1. Create the environment file(s)
./scripts/setup_environment.sh

# 2. Install the dependencies
pnpm install

# 3. Build our packages
pnpm build

# 4. Echo we're done
echo "🌳 worktree setup complete 🌳"
echo "   - path: $PWD"
echo ""
