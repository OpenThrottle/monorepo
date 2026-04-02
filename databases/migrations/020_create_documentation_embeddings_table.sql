-- Create documentation_embeddings table
-- Vector embeddings for doc chunks (semantic search over docs/ content).
CREATE TABLE IF NOT EXISTS documentation_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    embedding vector (1536), -- 1536 required: OpenAI (default) or Ollama with 1536-dim model; see README § Embedding dimension strategy
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    documentation_id UUID NOT NULL REFERENCES documentation (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documentation_embeddings_documentation_id
  ON documentation_embeddings (documentation_id);
CREATE INDEX IF NOT EXISTS idx_documentation_embeddings_vector
  ON documentation_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_documentation_embeddings_metadata
  ON documentation_embeddings USING GIN (metadata);
