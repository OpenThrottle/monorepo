#!/usr/bin/env bash

# Run openthrottle-mcp MCP server on stdio. Build output is sent to stderr so stdout
# contains only JSON-RPC for the MCP client.
# Sets WORKTREE_ID from git worktree root basename so each worktree advertises a distinct MCP server name.
set -e

echo "🔍 Using Node.js version: $(node -v)" > /dev/stderr

cd "$(dirname "$0")/.."

# Worktree-aware identity: basename of git root (e.g. monorepo-worktree-one). Unset if not in a git repo.
if git_root=$(git rev-parse --show-toplevel 2>/dev/null); then
  export WORKTREE_ID=$(basename "$git_root")
else
  unset -v WORKTREE_ID
fi

# Semantic search embeddings are configured on openthrottle-server (OPENAI_API_KEY or
# OLLAMA_* in applications/openthrottle-server/.env), not in this launcher. See
# docs/openthrottle/run-locally-oss.md and packages/openthrottle-mcp/docs/verification-environment.md.

# pnpm nx run @openthrottle/openthrottle-mcp:build 1>&2
exec node packages/openthrottle-mcp/dist/src/bin.js
