# @openthrottle/nestjs-vector-search

Server-side **code semantic search** for OpenThrottle. It runs the
[`@openthrottle/openthrottle-ide`](../openthrottle-ide) engine inside
`openthrottle-server` (which already owns Postgres + pgvector + embeddings) and
exposes it via GraphQL, so the GraphQL-only `openthrottle-developer` app can power the
`/ide` **Semantic** tab without its own DB connection (architecture B).

## What it provides

- **`CodeVectorStore`** — a pgvector-backed implementation of the engine's injectable
  `VectorStore` interface, persisting code-chunk vectors in the `code_embeddings` table
  via raw SQL on the injected TypeORM `DataSource` (the `<=>` cosine operator + HNSW
  index). Methods: `clear`, `deleteByPaths`, `query`, `upsert`, `count` — all scoped by
  `workspaceRoot`.
- **`CodeSearchService`** — orchestration over the engine:
  - `indexCodeWorkspace(workspaceRoot)` — full re-index (chunk → embed → upsert).
  - `codeSemanticSearch(workspaceRoot, query, topK?)` — top-k natural-language search.
  - `indexedChunkCount(workspaceRoot)` — drives ready-vs-not-indexed status.
  - `isProviderConfigured()` — whether the host's embedder can embed.
- **`NestjsVectorSearchModule.register({ embedder, imports })`** — provides + exports both,
  binding the host's embedder class to the `CODE_EMBEDDER` token. The package ships **no
  embedder of its own**: `openthrottle-server` passes its single `EmbedderService` (the
  `@openthrottle/node-client` embedder that also serves plans, tasks and docs).

## Consumers

`openthrottle-server` wires this into:

- the **code-index BullMQ queue** (`src/queues/code-index`) — async full re-index, and
- the **code-search GraphQL resolver** (`src/graphql/code-search`) — `codeSemanticSearch`
  query, `indexCodeRepository` mutation, `codeIndexStatus` query.

The host app must configure a TypeORM root (the default `DataSource` is injected into
`CodeVectorStore`) — `openthrottle-server` registers it from `getOpenThrottleTypeOrmOptions()`.

## Prerequisites

1. **Migration** — the `code_embeddings` table must exist. Apply it with:

   ```bash
   pnpm run database:start      # Postgres (+ Redis)
   pnpm run database:migrate    # applies migrations 052 (table) and 164 (768 dims + provenance)
   ```

2. **Embedder** — the server's embedder (nomic-embed-text-v1.5, 768 dims; local by default,
   Ollama optional). See [databases/openthrottle/README.md § Embedding dimension strategy](../../databases/openthrottle/README.md).
   While it is unconfigured, `codeIndexStatus` returns `unavailable` and the Semantic tab
   renders its gated state.

## Using the /ide Semantic tab

1. Register a local repository in **Settings → Workspace** (provides the
   `filesystemPath` the server indexes; the client only ever sends the `repositoryId`).
2. Open **/ide → Semantic**, click **Index**, and wait for indexing to finish (the tab
   polls status).
3. Type a natural-language query and **Search** — ranked code matches render with their
   `path:line` location, similarity score, and snippet.

Indexing runs asynchronously on the `Code Index` BullMQ queue; v1 does a full re-index
each run (incremental `diffSnapshots` is a planned enhancement).
