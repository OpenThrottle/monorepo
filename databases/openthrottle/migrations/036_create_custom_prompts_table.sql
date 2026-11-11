-- Create custom_prompts table
-- Stores custom prompt documents (Agents.md, skills, commands, prompts) for AI workflow customization.
-- Supports CRUD operations, type/label tagging, and file system persistence reference.
CREATE TABLE IF NOT EXISTS custom_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Core content
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,

    -- Type: strict set of document purposes (enum-like constraint)
    -- agents = AGENTS.md or agent instructions
    -- skills = reusable skill definitions
    -- commands = slash commands or CLI instructions
    -- prompts = general purpose prompts or templates
    -- rules = coding rules or style guides (.mdc files)
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('agents', 'skills', 'commands', 'prompts', 'rules')),

    -- Labels: miscellaneous tags for filtering/categorization (JSONB array of strings)
    labels JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- File system reference (optional; path relative to workspace root)
    file_path TEXT,

    -- User ownership (optional FK to users; null = system-level or shared)
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,

    -- Project association (optional FK to projects; null = cross-project or global)
    project_id UUID REFERENCES projects (id) ON DELETE SET NULL,

    -- Soft delete support
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index on prompt_type for filtering by document purpose
CREATE INDEX IF NOT EXISTS idx_custom_prompts_prompt_type ON custom_prompts (prompt_type);

-- GIN index on labels JSONB for efficient tag filtering
CREATE INDEX IF NOT EXISTS idx_custom_prompts_labels ON custom_prompts USING GIN (labels);

-- Index on user_id for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user_id ON custom_prompts (user_id)
WHERE user_id IS NOT NULL;

-- Index on project_id for project-scoped queries
CREATE INDEX IF NOT EXISTS idx_custom_prompts_project_id ON custom_prompts (project_id)
WHERE project_id IS NOT NULL;

-- Index on file_path for lookups by path
CREATE INDEX IF NOT EXISTS idx_custom_prompts_file_path ON custom_prompts (file_path)
WHERE file_path IS NOT NULL;

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_custom_prompts_created_at ON custom_prompts (created_at DESC);

-- Index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_custom_prompts_updated_at ON custom_prompts (updated_at DESC);

-- Composite index for common list query: type + created_at
CREATE INDEX IF NOT EXISTS idx_custom_prompts_type_created_at ON custom_prompts (prompt_type, created_at DESC);

-- Partial index excluding soft-deleted rows (common query pattern)
CREATE INDEX IF NOT EXISTS idx_custom_prompts_active ON custom_prompts (created_at DESC)
WHERE deleted_at IS NULL;

-- pg_trgm index on title for ILIKE search (requires pg_trgm extension from 018)
CREATE INDEX IF NOT EXISTS idx_custom_prompts_title_trgm ON custom_prompts USING GIN (title gin_trgm_ops);

-- Trigger to update updated_at timestamp (reuses function from 002)
DROP TRIGGER IF EXISTS update_custom_prompts_updated_at ON custom_prompts;

CREATE TRIGGER update_custom_prompts_updated_at
  BEFORE UPDATE ON custom_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
