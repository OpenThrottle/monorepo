-- Create task_embeddings table
-- Stores vector embeddings for task content to enable semantic search
CREATE TABLE IF NOT EXISTS task_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    embedding vector (1536), -- 1536 required: OpenAI (default) or Ollama with 1536-dim model; see README § Embedding dimension strategy
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE
);

-- Create index on task_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_task_embeddings_task_id ON task_embeddings (task_id);

-- Create vector index for similarity search using HNSW (Hierarchical Navigable Small World)
-- This enables fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_task_embeddings_vector ON task_embeddings USING hnsw (embedding vector_cosine_ops);

-- Create GIN index on metadata JSONB for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_embeddings_metadata ON task_embeddings USING GIN (metadata);