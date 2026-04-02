-- Create plans table
-- Stores plan metadata from the plans/ directory JSON files
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    title TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans (status);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_plans_category ON plans (category);

-- Create index on author for filtering
CREATE INDEX IF NOT EXISTS idx_plans_author ON plans (author);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans (created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();