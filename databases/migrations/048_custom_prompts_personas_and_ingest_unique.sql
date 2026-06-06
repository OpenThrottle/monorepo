-- Extend custom_prompts prompt_type for persona ingest and add upsert natural key (D2).
-- Natural key: (file_path, prompt_type) for active rows (deleted_at IS NULL).

ALTER TABLE custom_prompts
DROP CONSTRAINT IF EXISTS custom_prompts_prompt_type_check;

ALTER TABLE custom_prompts
ADD CONSTRAINT custom_prompts_prompt_type_check
CHECK (prompt_type IN ('agents', 'skills', 'commands', 'prompts', 'rules', 'personas'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_prompts_file_path_prompt_type
ON custom_prompts (file_path, prompt_type)
WHERE file_path IS NOT NULL;
