# @openthrottle/ai-mcp — agent notes

Legacy MCP server exposing OpenThrottle Cortex plans/tasks over stdio, talking **directly
to Cortex Postgres + embeddings** (OpenAI or Ollama). Deprecated in favor of
[`@openthrottle/openthrottle-mcp`](../openthrottle-mcp/) (GraphQL-only, feature parity).

**Consumed by:** `openthrottle-server` only. New callers should use `openthrottle-mcp`.

## Commands

- `pnpm nx run @openthrottle/ai-mcp:serve` — builds, then runs `dist/src/bin.js` on stdio
  (Cursor / MCP Inspector). Requires Cortex Postgres + embedding env (see README).

## Layout

- `src/bin.ts` / `src/cortex-server.ts` — stdio entrypoint and MCP server wiring.
- `src/tools/*` — one file per MCP tool (`search`, `plans`, `tasks`, `notes`, `commit`,
  `activity`, `health`); `src/resources/knowledge-base.ts` — the chunk resource.
- `src/cortex-client.ts` + `src/data-source.ts` — TypeORM/`pg` connection to Cortex.
- `src/embedding.ts` / `src/ollama-embedding.ts` — query embedding (OpenAI vs Ollama).

## Invariants & gotchas

- Built, not source-first: real `build` target, `exports["."]` → `./dist/...`; keep
  `exports` in sync with `src` layout (see [../AGENTS.md](../AGENTS.md)).
- Only package here that connects to Postgres directly. No raw SQL/credentials are exposed
  to the MCP client — keep it that way.
- `health` with no args is a server-only ping; pass `checkDb: true` to reach Cortex.

## Pointers

- [README.md](./README.md) — full env matrix (Postgres, OpenAI/Ollama), tool reference.
- [DEPRECATION.md](./DEPRECATION.md) — migration to `openthrottle-mcp`.
