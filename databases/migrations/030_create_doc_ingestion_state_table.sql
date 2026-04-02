-- Prior state for diff-based doc ingestion (BullMQ job).
-- One row per (scope, path); content_hash (e.g. SHA-256) used to detect changes.
-- See docs/openthrottle/doc-ingestion-job-spec.md.
CREATE TABLE IF NOT EXISTS doc_ingestion_state (
    scope TEXT NOT NULL,
    path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope, path)
);

CREATE INDEX IF NOT EXISTS idx_doc_ingestion_state_scope ON doc_ingestion_state (scope);

CREATE INDEX IF NOT EXISTS idx_doc_ingestion_state_updated_at ON doc_ingestion_state (scope, updated_at DESC);