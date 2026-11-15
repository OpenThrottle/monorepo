-- Code embeddings on the unified embedder (OT plan e489d73d): move code_embeddings to
-- nomic-embed-text-v1.5 at 768 dimensions with the same per-row provenance as the other four
-- embedding tables (migration 163).
--
-- Unlike 163, the chunk rows are KEPT. A code chunk's text lives in this table (`content`), so the
-- server's embeddings reconciler can re-embed every row from it without re-reading the workspace
-- or re-indexing the repository. Only the 1536-dim vector is discarded: the column is dropped and
-- re-added as a NULLABLE vector(768). A NULL embedding (or a NULL/other embedding_model) means the
-- row is stale — code search ignores it and the reconciler fills it in.
--
-- Guarded on the column not already being vector(768), so a re-run never drops re-embedded vectors.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema()
      AND c.relname = 'code_embeddings'
      AND a.attname = 'embedding'
      AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) <> 'vector(768)'
  ) THEN
    DROP INDEX IF EXISTS idx_code_embeddings_vector;
    ALTER TABLE code_embeddings DROP COLUMN embedding;
  END IF;
END
$$;

ALTER TABLE code_embeddings ADD COLUMN IF NOT EXISTS embedding vector (768);
ALTER TABLE code_embeddings ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE code_embeddings ADD COLUMN IF NOT EXISTS embedding_dims INTEGER;

-- Same single global HNSW index as 052 (see its recall/scale note); NULL vectors are not indexed.
CREATE INDEX IF NOT EXISTS idx_code_embeddings_vector
  ON code_embeddings USING hnsw (embedding vector_cosine_ops);

COMMENT ON COLUMN code_embeddings.embedding IS 'nomic-embed-text-v1.5 vector (768 dims) of content, embedded with the search_document: prefix. NULL until the openthrottle-server embedder has embedded the chunk; search skips NULL rows.';
COMMENT ON COLUMN code_embeddings.embedding_model IS 'Model that produced embedding (e.g. nomic-embed-text-v1.5). NULL or a value other than the configured model means the row is stale: search ignores it and the reconciler re-embeds it from content.';
COMMENT ON COLUMN code_embeddings.embedding_dims IS 'Dimension of embedding as returned by the model; must equal the column dimension (768).';
COMMENT ON COLUMN code_embeddings.content_hash IS 'sha256 hex of the exact text embedded (document prefix + content, capped). A mismatch with content means the row is stale and the reconciler re-embeds it.';
