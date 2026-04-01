-- Enable the pgvector extension
-- This migration ensures pgvector is available for vector operations
CREATE EXTENSION IF NOT EXISTS vector;