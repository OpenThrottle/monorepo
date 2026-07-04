# @openthrottle/nestjs-vector-search — agent notes

Server-side code semantic search: a pgvector-backed implementation of the
`@openthrottle/openthrottle-ide` engine's `VectorStore` plus `CodeSearchService`
orchestration (index → embed → query), backing the developer app's `/ide` Semantic tab
through `openthrottle-server` GraphQL ("architecture B" — the client never touches the DB).

**Consumed by:** `openthrottle-server` only — the code-index BullMQ queue
(`src/queues/code-index`) and the code-search resolver (`src/graphql/code-search`).

## Layout

- `src/code-vector-store.ts` — raw SQL against the `code_embeddings` table (cosine `<=>` +
  HNSW); every method is scoped by `workspaceRoot`.
- `src/code-search.service.ts` — `indexCodeWorkspace`, `codeSemanticSearch`,
  `indexedChunkCount`, `isProviderConfigured`.
- `src/code-snapshot-store.ts` — snapshot baseline for (planned) incremental indexing;
  v1 still does a full re-index per run.
- `src/app-config.service.ts` — resolves the embeddings provider from env.
- `src/nestjs-vector-search.module.ts` — provides/exports all four; no config module of its own.

## Invariants & gotchas

- Built package (real `build`/`dev` targets, `exports` → `dist/`; the extra `__build-package`
  key is a placeholder) — see [../AGENTS.md](../AGENTS.md).
- The host app must configure a TypeORM root: `CodeVectorStore`/`CodeSnapshotStore` inject the
  default `DataSource` (in `openthrottle-server` that's `NestjsRepositoriesModule`). The module
  fails DI without one.
- Requires migration `052_create_code_embeddings_table.sql` — `code_embeddings` has a
  different shape from the other embedding tables (content-hash TEXT PK, no FK/metadata).
- Embeddings are `vector(1536)`; the platform silently skips vectors of any other length. The
  OpenAI-vs-Ollama dimension strategy lives in
  [databases/README.md § Embedding dimension strategy](../../databases/README.md) — link to it,
  don't restate it.
- No embeddings provider configured is a supported state: `isProviderConfigured()` drives the
  `unavailable` status and the Semantic tab's gated UI — don't turn it into a thrown error.

## Pointers

- [README.md](./README.md) — consumer wiring, prerequisites, and the /ide Semantic tab flow.
