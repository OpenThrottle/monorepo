-- Create code_index_snapshots table
-- Per-workspace file-hash snapshot (the @openthrottle/openthrottle-ide engine's `hashWorkspace`
-- output: a list of { path, hash } for every tracked file) that enables INCREMENTAL code
-- re-indexing. On the next index, CodeSearchService diffs the prior snapshot against a fresh
-- `hashWorkspace` (engine `diffSnapshots`) and re-embeds only added/changed files (deleting
-- removed ones) via `indexWorkspace({ diff })`, instead of clearing + re-embedding the whole
-- workspace. A workspace with no prior snapshot still does a FULL index; the snapshot is persisted
-- after each successful index. Keyed/scoped by workspace_root, mirroring code_embeddings (migration
-- 052). See packages/nestjs-vector-search and databases/README.md § Code semantic search.
CREATE TABLE IF NOT EXISTS code_index_snapshots (
    -- Workspace root (absolute filesystem path of the registered repository); 1 snapshot per
    -- workspace. Matches code_embeddings.workspace_root, so one index run reads/writes both by root.
    workspace_root TEXT PRIMARY KEY,

    -- Engine hashWorkspace() output: JSON array of { "path": <workspace-relative POSIX path>,
    -- "hash": <sha256 hex of file contents> }. Diffed (engine diffSnapshots) to compute the delta.
    snapshot JSONB NOT NULL,

    -- When this snapshot was last persisted (after a successful index).
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE code_index_snapshots IS
  'Per-workspace file-hash snapshot (openthrottle-ide hashWorkspace output) enabling incremental code re-indexing; diffed via diffSnapshots so only added/changed files are re-embedded. Scoped by workspace_root (mirrors code_embeddings).';
COMMENT ON COLUMN code_index_snapshots.workspace_root IS
  'Absolute filesystem path of the registered repository; one snapshot per workspace (matches code_embeddings.workspace_root).';
COMMENT ON COLUMN code_index_snapshots.snapshot IS
  'JSON array of { path, hash } (workspace-relative POSIX path + sha256 of contents) from the engine hashWorkspace(); diffed against a fresh scan to find added/changed/removed files.';
COMMENT ON COLUMN code_index_snapshots.updated_at IS
  'Timestamp of the last successful index that persisted this snapshot.';
