# @openthrottle/docs-mcp

MCP server for documentation search: semantic search over `docs/` content ingested into Cortex Postgres (`documentation` + `documentation_embeddings`). Use when you need to search the repo’s documentation by meaning (e.g. “how does NX caching work?”). Separate from **ai-mcp** (plans/tasks); docs-mcp is scoped to documentation only.

## Tools

- **documentation_semantic_search** – Search by meaning over `documentation_embeddings`. Requires `OPENAI_API_KEY` for query embedding and Cortex Postgres for the database.
- **get_document** – Fetch a single documentation chunk by id (UUID from `documentation_embeddings`). Use after `documentation_semantic_search` to read full chunk content.

## Environment

- **POSTGRES_URL** or **CORTEX*POSTGRES*\*** (host, port, db, user, password) – Cortex Postgres connection. Same as ai-mcp.
- **DOCS_MCP_POSTGRES_URL** or **DOCS*MCP*\*** – Optional overrides if you want docs-mcp to use a different config.
- **OPENAI_API_KEY** – Required for `documentation_semantic_search` (query embedding).

## Running

- **From repo root (Cursor MCP):** The server is registered in `.cursor/mcp.json` and started via `./scripts/run-docs-mcp.sh`.
- **CLI:** `pnpm exec docs-mcp` or `pnpm nx run @openthrottle/docs-mcp:serve` (after build).

## Ingest

Populate `documentation` and `documentation_embeddings` with:

```bash
pnpm run cortex:import-docs
```

See `databases/README.md` for schema and optional env (`DOCS_REPO`, `DOCS_SHA`, etc.).

## See also

- [AGENTS.md](../../AGENTS.md) — pnpm and Nx usage in this monorepo.
