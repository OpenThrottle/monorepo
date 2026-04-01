-- Create documentation table
-- Source-of-truth per doc file landed on main (from docs/ watch).
-- One row per (repo, sha, path) for idempotent upsert/replace-by-sha.
CREATE TABLE IF NOT EXISTS documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    repo TEXT NOT NULL,
    sha TEXT NOT NULL,
    pr_number INTEGER,
    authors JSONB NOT NULL DEFAULT '[]'::jsonb,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documentation_repo_sha_path
  ON documentation (repo, sha, path);
CREATE INDEX IF NOT EXISTS idx_documentation_path ON documentation (path);
CREATE INDEX IF NOT EXISTS idx_documentation_repo ON documentation (repo);
CREATE INDEX IF NOT EXISTS idx_documentation_sha ON documentation (sha);
CREATE INDEX IF NOT EXISTS idx_documentation_created_at ON documentation (created_at DESC);
