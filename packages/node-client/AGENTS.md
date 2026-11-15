# @openthrottle/node-client — agent notes

The **Node-only** OpenThrottle data client: pgvector similarity search over
`plan_embeddings` / `task_embeddings` / `documentation_embeddings`, plan/task/note
CRUD, and the single embedder (local nomic-embed-text-v1.5 in a worker thread, or the same
model via Ollama). It wraps a cached
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
- `src/embedding-config.ts` — `resolveEmbeddingConfig()` from `EMBEDDING_PROVIDER`
  (`local` default | `ollama` | `openai` | `gemini`), `EMBEDDING_MODEL`, `EMBEDDING_DIMS`,
  `EMBEDDING_MODELS_DIR`, `OLLAMA_BASE_URL`, and a hosted provider's `*_API_KEY` /
  `*_BASE_URL`. The config and the per-model spec are discriminated unions: self-hosted
  (open-weights spec: Hugging Face id, Ollama name, task prefixes) vs hosted (empty prefixes,
  API key + base URL). A model is only accepted by the provider that serves it.
- `src/embedding.ts` — `createEmbedder(config)`: prefixing (`search_document: ` /
  `search_query: `), truncation, batching and the dimension check over a provider backend.
  Returns an `EmbedResult` (`ok: true` with vectors + model + dims, or `ok: false` with
  `unconfigured` | `dimension_mismatch` | `provider_error`) — never `undefined`.
- `src/local-embedding.ts` — transformers.js in an eval'd worker thread, loading quantized
  ONNX weights from `EMBEDDING_MODELS_DIR` only (remote downloads disabled).
- `src/embedWithOllama.ts` — Ollama batch path (`POST /api/embed`), same model.
- `src/embedWithOpenAI.ts` / `src/embedWithGemini.ts` — hosted backends at `dimensions` /
  `outputDimensionality` 768; Gemini maps `inputType` to `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`.
  The backend `embed(texts, inputType)` receives the side so a provider can use it.
- `src/hosted-embedding-request.ts` — shared JSON POST with 429/5xx backoff (honours
  `Retry-After`) and L2 normalisation. The API key travels in headers only.
- `src/embedding-content.ts` — builds the text blob fed to the embedder for a plan/task.
- `src/config.ts` — `getPostgresConfig()` (returns `undefined` when Postgres isn't configured).
- `src/constants.ts` — `EMBEDDING_MAX_INPUT_CHARS` (8191, prefix included), shared across both
  providers so truncation — and therefore `content_hash` — is provider-agnostic.

## Invariants & gotchas

- **Node-only.** This package opens Postgres connections and reads `process.env`; never
  import it into browser/UI code. Server code that only needs types uses
  `import type { … } from '@openthrottle/node-client'` (see the plans/search resolvers).
- **One model, 768 dims** (nomic-embed-text-v1.5). Both providers run the same model, so their
  vectors are comparable; an unsupported model or a mismatched `EMBEDDING_DIMS` is refused at
  config time rather than written. Every row records its `embedding_model` so a model switch
  is a re-embed, never silent corruption.
- **Never call `createEmbedder` per request in the server.** `openthrottle-server`'s
  `EmbedderService` owns the one instance (and its worker thread) per process.
- **Entities are borrowed, not owned.** Schema changes live in `nestjs-repositories` +
  the SQL migration under `databases/openthrottle/migrations/`; this package only registers those
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
