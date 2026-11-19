# @openthrottle/nestjs-vector-search — agent notes

Server-side code semantic search: a pgvector-backed implementation of the
`@openthrottle/openthrottle-ide` engine's `VectorStore` plus `CodeSearchService`
orchestration (index → embed → query), backing the developer app's `/ide` Semantic tab
through `openthrottle-server` GraphQL ("architecture B" — the client never touches the DB).

**Consumed by:** `openthrottle-server` only — the code-index BullMQ queue
(`src/queues/code-index`) and the code-search resolver (`src/graphql/code-search`).

## Layout

- `src/code-vector-store/code-vector-store.service.ts` — raw SQL against the `code_embeddings` table (cosine `<=>` +
  HNSW); every method is scoped by `workspaceRoot`.
- `src/code-search/code-search.service.ts` — `indexCodeWorkspace`, `codeSemanticSearch`,
  `indexedChunkCount`, `isProviderConfigured`.
- `src/code-snapshot-store/code-snapshot-store.service.ts` — snapshot baseline for (planned) incremental indexing;
  v1 still does a full re-index per run.
- `src/code-embedder/` — the `CODE_EMBEDDER` token and `CodeEmbedder` port; the host binds its
  embedder to it. This package never resolves a provider or reads embedding env itself.
- `src/nestjs-vector-search.module.ts` — `register({ embedder, imports })` provides/exports the
  three services.

## Invariants & gotchas

- Built package (real `build`/`dev` targets, `exports` → `dist/`; the extra `__build-package`
  key is a placeholder) — see [../AGENTS.md](../AGENTS.md).
- The host app must configure a TypeORM root: `CodeVectorStore`/`CodeSnapshotStore` inject the
  default `DataSource` (in `openthrottle-server`, `TypeOrmModule.forRootAsync` over `getOpenThrottleTypeOrmOptions()`). The module
  fails DI without one.
- Requires migrations `052` and `164` — `code_embeddings` has a different shape from the
  other embedding tables (content-hash TEXT PK, no FK/metadata) but the same provenance columns.
- Rows are written with `embedding_model` / `embedding_dims` and a `content_hash` of the exact
  embedded text (`prepareEmbeddingInput`); `query` reads only rows of the configured model. Keep
  the hash in step with the server reconciler's SQL. Dimension strategy:
  [databases/openthrottle/README.md § Embedding dimension strategy](../../databases/openthrottle/README.md) — link to it,
  don't restate it.
- An unconfigured embedder is a supported state: `isProviderConfigured()` drives the
  `unavailable` status and the Semantic tab's gated UI — don't turn it into a thrown error.

## Pointers

- [README.md](./README.md) — consumer wiring, prerequisites, and the /ide Semantic tab flow.
