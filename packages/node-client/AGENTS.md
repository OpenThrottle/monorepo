# @openthrottle/node-client — agent notes

The **Node-only** OpenThrottle data client: pgvector similarity search over
`plan_embeddings` / `task_embeddings` / `documentation_embeddings`, plan/task/note
CRUD, and the env-driven embedding provider (OpenAI or Ollama). It wraps a cached
TypeORM `DataSource` around the entities owned by `@openthrottle/nestjs-repositories`
and exposes a small, framework-free surface that both the GraphQL server and the
agentic tooling call.

**Consumed by:** `openthrottle-server` (resolvers/services — plans, search,
agent-asset search, plan-creation) and `@openthrottle/openthrottle-agentic-utils`.

## Layout

- `src/index.ts` — barrel; add every new public symbol here (no deep imports from consumers).
- `src/openthrottle-client.ts` — the vector-search + plan/task read/query surface;
  normalizes TypeORM results (`array` vs pg-style `{ rows, rowCount }`) before mapping
  to typed rows.
- `src/data-source.ts` — cached `getOrCreateDataSource()` (one initialized `DataSource`
  per connection string, for pooling) registering `Plan`, `Task`, `PlanEmbedding`,
  `TaskEmbedding`, `Project`, `CommitLink`, `PlanOutputStreamChunk`.
- `src/embedding.ts` — `embedQuery` abstraction; provider is env-driven (Ollama when
  `OLLAMA_BASE_URL`/`OLLAMA_EMBEDDING_MODEL` set, otherwise OpenAI via `OPENAI_API_KEY`).
- `src/ollama-embedding.ts` — local Ollama path (`POST /api/embeddings`); defaults
  `nomic-embed-text` @ `http://localhost:11434`.
- `src/embedding-content.ts` — builds the text blob fed to the embedder for a plan/task.
- `src/config.ts` — `getPostgresConfig()` (returns `undefined` when Postgres isn't configured).
- `src/constants.ts` — `EMBEDDING_MAX_INPUT_CHARS` (8191), shared across both providers so
  truncation is provider-agnostic.

## Invariants & gotchas

- **Node-only.** This package opens Postgres connections and reads `process.env`; never
  import it into browser/UI code. Server code that only needs types uses
  `import type { … } from '@openthrottle/node-client'` (see the plans/search resolvers).
- **Embeddings are 1536-dim** (`text-embedding-3-small`). `embedQuery` returns `undefined`
  rather than throwing when no provider is configured or a request fails — callers must
  handle the `undefined` (skip embedding, degrade search), not assume a vector.
- **Provider selection is silent + env-driven.** Setting either `OLLAMA_*` var flips the
  whole path to Ollama; an Ollama model with a different dimensionality will not match the
  stored 1536-dim OpenAI vectors. Keep the ingest provider and the query provider aligned.
- **Entities are borrowed, not owned.** Schema changes live in `nestjs-repositories` +
  the SQL migration under `databases/migrations/`; this package only registers those
  entities on its `DataSource`. If a new entity is needed for a query, add it to the
  `entities` array in `data-source.ts`.
- **Source-first, but ships `dist` to the server.** `nx.targets` uses the `__build` /
  `__build-package` placeholder keys → **no** real `build` target (don't add one).
  However, because `openthrottle-server` imports it, top-level `exports` must point at
  `./dist/**` (not only `publishConfig`), or the Docker runtime fails with
  `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on `src/*.ts`. Validate with
  `lint`/`typecheck`/`test`; use a server build as the integration check.

## Pointers

- [README.md](./README.md) — install/consume notes (currently a stub; expand when touched).
- [../AGENTS.md](../AGENTS.md) — `packages/` family rules (source-first vs built, import rules).
- [../nestjs-repositories/AGENTS.md](../nestjs-repositories/AGENTS.md) — the entities this client registers.
- [../../databases/AGENTS.md](../../databases/AGENTS.md) — migrations behind the embedding tables.
