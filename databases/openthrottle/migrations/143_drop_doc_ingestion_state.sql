-- Drop doc_ingestion_state, the bookkeeping table of the removed Doc Ingestion BullMQ queue.
--
-- Plan-Id: 0db118d8-c17e-4287-b10d-210ea82c8962 (Tear down the Doc Ingestion BullMQ queue).
--
-- The table (migration 030) held one content hash per (scope, path) so the queue could diff a
-- re-ingest into to-add / to-update / to-remove. The queue never ingested successfully and has been
-- removed from openthrottle-server, so nothing reads or writes these rows. They are derived hashes,
-- not user data — dropping them loses nothing. The primary key and both indexes
-- (idx_doc_ingestion_state_scope, idx_doc_ingestion_state_updated_at) go with the table.
--
-- Applied migrations 030, 039 and 102 still mention the table and are left untouched.
--
-- Idempotent: IF EXISTS makes a second run a no-op.

DROP TABLE IF EXISTS doc_ingestion_state;
