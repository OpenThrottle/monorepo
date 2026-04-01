#!/usr/bin/env bash

# Run ai-mcp MCP server on stdio. Build output is sent to stderr so stdout
# contains only JSON-RPC for the MCP client.
# Sets WORKTREE_ID from git worktree root basename so each worktree advertises a distinct MCP server name.
set -e

cd "$(dirname "$0")/.."

# Worktree-aware identity: basename of git root (e.g. monorepo-worktree-one). Unset if not in a git repo.
if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  export WORKTREE_ID=$(basename "$git_root")
else
  unset -v WORKTREE_ID
fi

# Match only the line that defines OPENAI_API_KEY (^OPENAI_API_KEY=), not comment lines
# that mention OPENAI_API_KEY. Use -f 2- so the value can contain '='.
OPENAI_API_KEY=$(grep -E '^OPENAI_API_KEY=' .env | cut -d '=' -f 2-)
if [ -z "$OPENAI_API_KEY" ];
then
  # https://platform.openai.com/account/api-keys to get one
  echo "OPENAI_API_KEY is not set"
  exit 1
fi

export OPENAI_API_KEY

pnpm nx run @openthrottle/ai-mcp:build 1>&2
exec node packages/mattscholta/ai-mcp/dist/src/bin.js
