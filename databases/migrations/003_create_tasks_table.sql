-- Create tasks table
-- Stores task data from plans JSON files with foreign key to plans
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    plan_id UUID NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    title TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on plan_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_tasks_plan_id ON tasks (plan_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);

-- Create GIN index on requirements JSONB for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_requirements ON tasks USING GIN (requirements);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();