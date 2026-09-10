-- Reap the orphaned `prompt_type = 'rules'` agent-asset rows and their embeddings.
--
-- `rules` is a RETIRED agent-asset kind. It described the `.agents/rules/**/*.mdc` +
-- `.cursor/rules/` tree, a Cursor-era construct that has been replaced by AGENTS.md
-- § Code style (the always-on layer, read natively by every agent) plus
-- docs/monorepo/code-style.md (rationale and examples). Nothing writes this
-- prompt_type any more.
--
-- WHY THIS NEEDS A MIGRATION RATHER THAN AN INGEST RUN
--
-- Agent assets are kept in sync by the ingest's stale sweep
-- (scripts/openthrottle-ingest-agent-assets.ts), which soft-deletes a row only when
-- its file_path matches one of AGENT_ASSET_INGEST_PATH_PREFIXES
-- (packages/openthrottle-skills/src/map-agent-assets-for-ingest.ts) AND is absent
-- from the current on-disk walk. Retiring the kind removed '.agents/rules/' from
-- that array — so from that commit onward the sweep no longer MATCHES these rows at
-- all. They would sit deleted_at IS NULL forever, keep live embeddings, and keep
-- surfacing in semantic_search and the /agent-search UI as ghost assets pointing at
-- files that no longer exist. Silently, with no error anywhere.
--
-- "Just run the ingest once before dropping the prefix" was considered and rejected:
-- it only fixes whichever database the implementer happened to have running, and
-- does nothing for a fresh clone, a teammate's database, or a deployed instance.
-- The schema_migrations ledger is what makes the cleanup deterministic everywhere.
--
-- SOFT delete, not hard delete — consistent with how the sweep already treats an
-- asset that disappears from disk, and it preserves the history of what these rules
-- said. The embeddings DO go: they are a derived search index, they are the reason a
-- stale row is user-visible, and pgvector rows are the expensive part to keep.
--
-- The prompt_type CHECK constraint is deliberately LEFT ALONE (see 036 and 048).
-- These rows still exist, so narrowing it would force a hard delete that destroys
-- history for no gain. 'rules' stays a legal value that nothing writes.
--
-- Idempotent: re-running is a no-op. The UPDATE is guarded by `deleted_at IS NULL`
-- and the DELETE by the rows' own existence, so neither re-stamps data.

-- Drop the derived search index first. Doing this before the soft delete means there
-- is no window where a row is still active but unsearchable in a confusing way, and
-- the FK is ON DELETE CASCADE so ordering is otherwise unconstrained.
DELETE FROM custom_prompt_embeddings
WHERE custom_prompt_id IN (
    SELECT id FROM custom_prompts WHERE prompt_type = 'rules'
);

UPDATE custom_prompts
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE prompt_type = 'rules'
  AND deleted_at IS NULL;

COMMENT ON COLUMN custom_prompts.prompt_type IS
'Agent-asset kind: agents, skills, commands, prompts, personas. ''rules'' is RETIRED — the .agents/rules + .cursor/rules tree it described was replaced by AGENTS.md § Code style and docs/monorepo/code-style.md; migration 111 soft-deleted those rows and dropped their embeddings. Rows with prompt_type = ''rules'' are expected history, not a bug, and nothing writes the value any more. The CHECK constraint still permits it so the soft-deleted rows remain legal.';
