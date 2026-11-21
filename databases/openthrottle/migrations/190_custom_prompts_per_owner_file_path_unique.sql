-- Scope custom_prompts' (file_path, prompt_type) natural key to its owner, so a user's prompt can
-- override a system prompt at the same path.
--
-- Migration 048's UNIQUE (file_path, prompt_type) was global: a user row and a system row
-- (user_id IS NULL) for one path could not coexist, so creating a prompt at a system prompt's
-- path failed with a unique violation and "user beats system" resolution
-- (CustomPromptsRepository.findVisibleByFilePath) was unreachable.
--
-- The replacement is unique per (file_path, prompt_type, owner). NULLS NOT DISTINCT makes every
-- system row one owner, so the agent-asset ingest keeps exactly one system row per path and its
-- ON CONFLICT (file_path, prompt_type, user_id) still infers this index. file_path stays the
-- leading column because migration 102 dropped idx_custom_prompts_file_path as covered by it.
-- Like 048's index it covers soft-deleted rows on purpose: the ingest revives a system prompt
-- whose file reappeared, and a user restores a deleted prompt rather than re-creating it.

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_prompts_file_path_prompt_type_owner
ON custom_prompts (file_path, prompt_type, user_id) NULLS NOT DISTINCT
WHERE file_path IS NOT NULL;

DROP INDEX IF EXISTS idx_custom_prompts_file_path_prompt_type;

COMMENT ON INDEX idx_custom_prompts_file_path_prompt_type_owner IS
  'OpenThrottle custom prompt natural key: one row per (file_path, prompt_type) per owner, with every system row (user_id IS NULL) sharing one owner via NULLS NOT DISTINCT. A user row may override a system row at the same path. Covers soft-deleted rows so the agent-asset ingest can revive one on conflict.';
