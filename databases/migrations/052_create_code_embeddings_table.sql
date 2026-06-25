-- Create code_embeddings table
-- Vector embeddings for source-code chunks, enabling natural-language code semantic
-- search over a registered workspace/repository (the /ide Semantic tab).
--
-- Unlike plan_embeddings / task_embeddings / documentation_embeddings (FK-to-parent +
-- metadata JSONB), this table is the concrete backing store for the
-- @openthrottle/openthrottle-ide engine's injectable `VectorStore` interface. Its shape
-- is dictated by that contract (see packages/openthrottle-ide/README.md § Semantic layer):
--   * `id` is a content-derived chunk id (hashContent(path + content)) — TEXT, not a UUID —
--     so incremental re-index upserts are idempotent (ON CONFLICT (id)).
--   * `workspace_root` scopes one store to many workspaces; every VectorStore method is
--     scoped by it (clear / deleteByPaths / query / upsert).
--   * `vector(1536)`: OpenAI text-embedding-3-small (default) or a 1536-dim Ollama model;
--     see databases/README.md § Embedding dimension strategy.
CREATE TABLE IF NOT EXISTS code_embeddings (
    -- Content-derived chunk id (hashContent(path + content)); stable across re-index for
    -- unchanged chunks, so upserts are idempotent.
    id TEXT PRIMARY KEY,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Workspace root (absolute filesystem path of the registered repository); scopes the
    -- store so one table can serve many workspaces.
    workspace_root TEXT NOT NULL,

    -- Workspace-relative POSIX path of the source file the chunk came from.
    path TEXT NOT NULL,

    -- 1-based inclusive line range of the chunk within its file.
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,

    -- Raw source text of the chunk.
    content TEXT NOT NULL,

    -- sha256 of the chunk content; lets the engine detect changed chunks.
    content_hash TEXT NOT NULL,

    -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small; see
    -- databases/README.md § Embedding dimension strategy).
    embedding vector (1536) NOT NULL
);

-- Btree index on (workspace_root, path) — scopes clear()/deleteByPaths() and per-file
-- deletes during incremental re-index.
CREATE INDEX IF NOT EXISTS idx_code_embeddings_workspace_path
  ON code_embeddings (workspace_root, path);

-- HNSW vector index for cosine similarity search (matches the 1 - (embedding <=> q) scoring
-- the engine's pgvector VectorStore expects).
--
-- Recall/scale note: this is a single global HNSW index with default build params, while every
-- query also filters `workspace_root = $N`. HNSW returns the global nearest neighbors first, which
-- are THEN filtered by workspace_root — so a small workspace co-located with much larger ones can
-- under-fill `topK` or see degraded recall. This is acceptable under the current low-workspace-count
-- (effectively single-tenant) assumption. If/when many large workspaces share this table, revisit:
-- per-workspace partial indexes (`WHERE workspace_root = '…'`) or tuned `m` / `ef_construction`
-- build params and a per-query `hnsw.ef_search`.
CREATE INDEX IF NOT EXISTS idx_code_embeddings_vector
  ON code_embeddings USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE code_embeddings IS
  'Source-code chunk embeddings backing the openthrottle-ide engine VectorStore for /ide code semantic search. Keyed by content-derived chunk id; scoped by workspace_root.';
COMMENT ON COLUMN code_embeddings.id IS
  'Content-derived chunk id (hashContent(path + content)); idempotent upsert key.';
COMMENT ON COLUMN code_embeddings.workspace_root IS
  'Absolute filesystem path of the registered repository; scopes every VectorStore operation.';
COMMENT ON COLUMN code_embeddings.path IS
  'Workspace-relative POSIX path of the source file.';
COMMENT ON COLUMN code_embeddings.start_line IS '1-based inclusive first line of the chunk.';
COMMENT ON COLUMN code_embeddings.end_line IS '1-based inclusive last line of the chunk.';
COMMENT ON COLUMN code_embeddings.content IS 'Raw source text of the chunk.';
COMMENT ON COLUMN code_embeddings.content_hash IS 'sha256 of the chunk content; detects changes.';
COMMENT ON COLUMN code_embeddings.embedding IS
  'pgvector(1536) embedding (OpenAI text-embedding-3-small or 1536-dim Ollama model).';
