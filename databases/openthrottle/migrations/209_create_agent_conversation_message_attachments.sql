-- Image attachments for chat messages. A row is created AT UPLOAD (owned by the uploading user,
-- message_id NULL); sending a chat turn later links it to the persisted user message. The row id
-- is the attachment id the client sends back. The bytes live on disk at
-- ~/.openthrottle/attachments/<sha256>.<ext>; this table holds metadata only, so two rows may
-- share one file (same sha256).
--
-- BaseHardDeleteModel shape (uuidv7 `id`, `created_at`) plus its own `updated_at`. Deleting the
-- message or the user cascades the row; the file is removed by a janitor once no row references
-- its sha256.
--
-- Idempotent: the table, indexes, comments and trigger are re-runnable. Foreign keys are added in
-- their own pg_constraint-guarded statements, never inline under IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS agent_conversation_message_attachments (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id UUID NOT NULL,
    message_id UUID,
    sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    original_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT agent_conversation_message_attachments_sha256_check
        CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT agent_conversation_message_attachments_mime_type_check
        CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp')),
    CONSTRAINT agent_conversation_message_attachments_byte_size_check
        CHECK (byte_size > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_conversation_message_attachments_user_id_fkey') THEN
    ALTER TABLE agent_conversation_message_attachments
      ADD CONSTRAINT agent_conversation_message_attachments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_conversation_message_attachments_message_id_fkey') THEN
    ALTER TABLE agent_conversation_message_attachments
      ADD CONSTRAINT agent_conversation_message_attachments_message_id_fkey
      FOREIGN KEY (message_id) REFERENCES agent_conversation_messages (id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_agent_conversation_message_attachments_message_id
    ON agent_conversation_message_attachments (message_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversation_message_attachments_sha256
    ON agent_conversation_message_attachments (sha256);

CREATE INDEX IF NOT EXISTS idx_agent_conversation_message_attachments_unlinked
    ON agent_conversation_message_attachments (user_id, created_at)
    WHERE message_id IS NULL;

DROP TRIGGER IF EXISTS update_agent_conversation_message_attachments_updated_at
    ON agent_conversation_message_attachments;

CREATE TRIGGER update_agent_conversation_message_attachments_updated_at
    BEFORE UPDATE ON agent_conversation_message_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agent_conversation_message_attachments IS
    'Image attachments on OpenThrottle chat messages. A row is created at upload, owned by the uploading user with message_id NULL, and linked to the persisted user message when the turn is sent. Metadata only: the bytes live on disk at ~/.openthrottle/attachments/<sha256>.<ext>. Rows cascade when the user or the message is deleted.';

COMMENT ON COLUMN agent_conversation_message_attachments.user_id IS
    'Uploader and owner. Every read and link is scoped to this user; cascades on user delete.';

COMMENT ON COLUMN agent_conversation_message_attachments.message_id IS
    'The user message this image was sent with. NULL from upload until the turn is sent; a row still NULL after the retention window is an abandoned upload and is swept. Cascades on message delete.';

COMMENT ON COLUMN agent_conversation_message_attachments.sha256 IS
    'Lowercase hex SHA-256 of the file bytes (64 characters); names the file on disk, so rows with the same hash share one file. The file is deleted only when no row references the hash.';

COMMENT ON COLUMN agent_conversation_message_attachments.mime_type IS
    'Sniffed image type: image/png, image/jpeg, image/gif or image/webp (enforced by a CHECK constraint).';

COMMENT ON COLUMN agent_conversation_message_attachments.byte_size IS
    'File size in bytes; always greater than zero.';

COMMENT ON COLUMN agent_conversation_message_attachments.width IS
    'Image width in pixels; NULL when it could not be read.';

COMMENT ON COLUMN agent_conversation_message_attachments.height IS
    'Image height in pixels; NULL when it could not be read.';

COMMENT ON COLUMN agent_conversation_message_attachments.original_name IS
    'File name the browser reported at upload, for display only; NULL when none was sent. Never used as a path.';
