-- Create notes table
-- Stores quick unstructured thoughts; foundation for notes route and planning workflow.
-- Exposed via MCP create_note, get_note, list_notes, update_note, delete_note.
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_author ON notes (author);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at DESC);

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
