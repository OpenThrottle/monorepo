-- Create plan_output_stream table
-- Stores streaming output (e.g. agent iteration log) per plan for DB-backed plans.
-- Content is appended in order; iteration is optional (e.g. Ralph iteration number).
CREATE TABLE IF NOT EXISTS plan_output_stream (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    iteration INTEGER,
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_output_stream_plan_id ON plan_output_stream (plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_output_stream_created_at ON plan_output_stream (plan_id, created_at);