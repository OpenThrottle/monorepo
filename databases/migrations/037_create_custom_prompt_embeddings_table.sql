-- Create custom_prompt_embeddings table
-- Vector embeddings for custom prompt content (semantic search over prompts, skills, commands, etc.).
-- Follows the same pattern as plan_embeddings, task_embeddings, and documentation_embeddings.
CREATE TABLE IF NOT EXISTS custom_prompt_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- FK to parent custom_prompt; cascade delete when prompt is deleted
    custom_prompt_id UUID NOT NULL REFERENCES custom_prompts (id) ON DELETE CASCADE,

    -- Chunk content (may be full content or a chunk for long prompts)
    content TEXT NOT NULL,

    -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small; see README § Embedding dimension strategy)
    embedding vector (1536),

    -- Metadata (e.g. chunk index, source info)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Index on custom_prompt_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_custom_prompt_embeddings_custom_prompt_id
  ON custom_prompt_embeddings (custom_prompt_id);

-- HNSW vector index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_custom_prompt_embeddings_vector
  ON custom_prompt_embeddings USING hnsw (embedding vector_cosine_ops);

-- GIN index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_custom_prompt_embeddings_metadata
  ON custom_prompt_embeddings USING GIN (metadata);
