-- Create commit_links table
-- Associates git commits with plans and optionally with a specific task.
-- plan_id is required; task_id is optional (NULL = plan-level link).
CREATE TABLE IF NOT EXISTS commit_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    message TEXT,
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
    repo TEXT NOT NULL,
    sha TEXT NOT NULL,
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commit_links_plan_task_repo_sha
  ON commit_links (plan_id, COALESCE(task_id, '00000000-0000-0000-0000-000000000000'::uuid), repo, sha);
CREATE INDEX IF NOT EXISTS idx_commit_links_plan_id ON commit_links (plan_id);
CREATE INDEX IF NOT EXISTS idx_commit_links_task_id ON commit_links (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commit_links_repo_sha ON commit_links (repo, sha);
