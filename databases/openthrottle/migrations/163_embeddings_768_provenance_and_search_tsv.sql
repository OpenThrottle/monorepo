-- Guaranteed embeddings (OT plan 165e86ef): move the four semantic-search embedding tables to
-- nomic-embed-text-v1.5 at 768 dimensions, record per-row provenance, and add a full-text
-- fallback column on the source tables the lexical search reads.
--
-- Scope: plan_embeddings, task_embeddings, documentation_embeddings, custom_prompt_embeddings.
-- code_embeddings is deliberately untouched (follow-up plan).
--
-- Existing vectors are 1536-dim (OpenAI) and cannot be cast to 768, so every row is deleted:
-- an embedding row is a derived index, and the server's reconciler re-embeds every source row
-- after this migration. The delete is guarded on the column still being vector(1536), so a
-- re-run never wipes the re-embedded rows.
--
-- One embedding row per source row from here on: a UNIQUE index on the source FK lets the
-- embeddings processor upsert with ON CONFLICT instead of delete-then-insert.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT *
    FROM (
      VALUES
        ('plan_embeddings', 'plan_id'),
        ('task_embeddings', 'task_id'),
        ('documentation_embeddings', 'documentation_id'),
        ('custom_prompt_embeddings', 'custom_prompt_id')
    ) AS v (table_name, fk_column)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = current_schema()
        AND c.relname = t.table_name
        AND a.attname = 'embedding'
        AND NOT a.attisdropped
        AND format_type(a.atttypid, a.atttypmod) <> 'vector(768)'
    ) THEN
      EXECUTE format('DELETE FROM %I', t.table_name);
      EXECUTE format('DROP INDEX IF EXISTS %I', 'idx_' || t.table_name || '_vector');
      EXECUTE format('ALTER TABLE %I ALTER COLUMN embedding TYPE vector(768)', t.table_name);
    END IF;

    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS embedding_model TEXT', t.table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS embedding_dims INTEGER', t.table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS content_hash TEXT', t.table_name);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I USING hnsw (embedding vector_cosine_ops)',
      'idx_' || t.table_name || '_vector',
      t.table_name
    );
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (%I)',
      'uq_' || t.table_name || '_' || t.fk_column,
      t.table_name,
      t.fk_column
    );
  END LOOP;
END
$$;

-- The FK indexes from 004/005/020/037 are now redundant with the unique ones above.
DROP INDEX IF EXISTS idx_plan_embeddings_plan_id;
DROP INDEX IF EXISTS idx_task_embeddings_task_id;
DROP INDEX IF EXISTS idx_documentation_embeddings_documentation_id;
DROP INDEX IF EXISTS idx_custom_prompt_embeddings_custom_prompt_id;

COMMENT ON COLUMN plan_embeddings.embedding IS 'nomic-embed-text-v1.5 vector (768 dims) of content, embedded with the search_document: prefix. Written only by the openthrottle-server embeddings queue.';
COMMENT ON COLUMN plan_embeddings.embedding_model IS 'Model that produced embedding (e.g. nomic-embed-text-v1.5). NULL or a value other than the configured model means the row is stale: search ignores it and the reconciler re-embeds it.';
COMMENT ON COLUMN plan_embeddings.embedding_dims IS 'Dimension of embedding as returned by the model; must equal the column dimension (768).';
COMMENT ON COLUMN plan_embeddings.content_hash IS 'sha256 hex of the exact text embedded. A mismatch with the current source content means the row is stale and the reconciler re-embeds it.';

COMMENT ON COLUMN task_embeddings.embedding IS 'nomic-embed-text-v1.5 vector (768 dims) of content, embedded with the search_document: prefix. Written only by the openthrottle-server embeddings queue.';
COMMENT ON COLUMN task_embeddings.embedding_model IS 'Model that produced embedding (e.g. nomic-embed-text-v1.5). NULL or a value other than the configured model means the row is stale: search ignores it and the reconciler re-embeds it.';
COMMENT ON COLUMN task_embeddings.embedding_dims IS 'Dimension of embedding as returned by the model; must equal the column dimension (768).';
COMMENT ON COLUMN task_embeddings.content_hash IS 'sha256 hex of the exact text embedded. A mismatch with the current source content means the row is stale and the reconciler re-embeds it.';

COMMENT ON COLUMN documentation_embeddings.embedding IS 'nomic-embed-text-v1.5 vector (768 dims) of content, embedded with the search_document: prefix. Written only by the openthrottle-server embeddings queue.';
COMMENT ON COLUMN documentation_embeddings.embedding_model IS 'Model that produced embedding (e.g. nomic-embed-text-v1.5). NULL or a value other than the configured model means the row is stale: search ignores it and the reconciler re-embeds it.';
COMMENT ON COLUMN documentation_embeddings.embedding_dims IS 'Dimension of embedding as returned by the model; must equal the column dimension (768).';
COMMENT ON COLUMN documentation_embeddings.content_hash IS 'sha256 hex of the exact text embedded. A mismatch with the current source content means the row is stale and the reconciler re-embeds it.';

COMMENT ON COLUMN custom_prompt_embeddings.embedding IS 'nomic-embed-text-v1.5 vector (768 dims) of content, embedded with the search_document: prefix. Written only by the openthrottle-server embeddings queue.';
COMMENT ON COLUMN custom_prompt_embeddings.embedding_model IS 'Model that produced embedding (e.g. nomic-embed-text-v1.5). NULL or a value other than the configured model means the row is stale: search ignores it and the reconciler re-embeds it.';
COMMENT ON COLUMN custom_prompt_embeddings.embedding_dims IS 'Dimension of embedding as returned by the model; must equal the column dimension (768).';
COMMENT ON COLUMN custom_prompt_embeddings.content_hash IS 'sha256 hex of the exact text embedded. A mismatch with the current source content means the row is stale and the reconciler re-embeds it.';

-- Lexical fallback: semantic search answers with Postgres full-text search over these columns
-- when the embedder is unconfigured or failing. Long bodies are capped so a pathological row
-- cannot exceed the 1 MB tsvector limit and fail its own write.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  || setweight(to_tsvector('english', left(coalesce(description, ''), 200000)), 'C')
) STORED;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  || setweight(to_tsvector('english', left(coalesce(description, ''), 200000)), 'C')
) STORED;

ALTER TABLE documentation ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(path, '')), 'A')
  || setweight(to_tsvector('english', left(coalesce(content, ''), 200000)), 'C')
) STORED;

ALTER TABLE custom_prompts ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(description, '')), 'B')
  || setweight(to_tsvector('english', left(coalesce(content, ''), 200000)), 'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_plans_search_tsv ON plans USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_tasks_search_tsv ON tasks USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_documentation_search_tsv ON documentation USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_custom_prompts_search_tsv ON custom_prompts USING GIN (search_tsv);

COMMENT ON COLUMN plans.search_tsv IS 'Generated full-text vector (title A, summary B, description C) for the lexical fallback of semantic search when the embedder is unavailable.';
COMMENT ON COLUMN tasks.search_tsv IS 'Generated full-text vector (title A, summary B, description C) for the lexical fallback of semantic search when the embedder is unavailable.';
COMMENT ON COLUMN documentation.search_tsv IS 'Generated full-text vector (path A, content C) for the lexical fallback of semantic search when the embedder is unavailable.';
COMMENT ON COLUMN custom_prompts.search_tsv IS 'Generated full-text vector (title A, description B, content C) for the lexical fallback of semantic search when the embedder is unavailable.';
