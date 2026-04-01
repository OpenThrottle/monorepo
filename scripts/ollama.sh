#!/usr/bin/env sh
set -e

if ! which ollama > /dev/null;
then
  echo "🦙 Ollama is not installed." \
  "\n\n" \
  "1. Please install it from https://ollama.com/download" \
  "\n" \
  "2. Start the application and re-run this script" \
  "\n\n\n" \
  "Note: we run Ollama using the app to take full advantage of our computer's GPU."

  exit 1
fi

echo ""
echo "🦙 ollama.sh"
echo ""
echo "This script pulls the Ollama models we need for local workflows."
echo ""
echo "For local embeddings (ai-mcp, cortex:import): set OLLAMA_BASE_URL (default http://localhost:11434)"
echo "and/or OLLAMA_EMBEDDING_MODEL (e.g. nomic-embed-text). When set, Ollama is used; when not set, OpenAI is used."
echo "When using Caddy (tools/caddy), set OLLAMA_BASE_URL to the proxied URL and OLLAMA_ORIGINS so CORS allows requests. See docs/monorepo/Ollama.md."
echo "To use Caddy HTTPS without cert errors, run: caddy trust (see tools/caddy/README.md)."
echo ""

#
# https://ollama.com/library/qwen3-coder-next
#

# Chat models
ollama pull llama4

# Coding models
ollama pull qwen3-coder-next

# Embedding models (used when OLLAMA_EMBEDDING_MODEL / OLLAMA_BASE_URL are set for ai-mcp and cortex:import).
# For Cortex schema (vector 1536), use a model that outputs 1536 dimensions; these models use other dimensions (all-minilm 384, mxbai-embed-large 1024, nomic-embed-text 768). For 1536-dim Cortex embeddings use OpenAI or an Ollama model that outputs 1536 when available. See databases/cortex/README.md § Embedding dimension strategy.
ollama pull all-minilm
ollama pull mxbai-embed-large
ollama pull nomic-embed-text

echo ""
echo "✅ ollama.sh"
echo ""
