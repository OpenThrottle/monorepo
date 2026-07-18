-- Add a required, human-readable title to tag_action_rules so every rule carries
-- a scannable name in the rules list/table and forms, rather than being identified
-- solely by its match/action shape. The table is empty at migration time, so the
-- column is added NOT NULL with no default and no backfill. title is required and
-- non-empty (non-empty enforced in TagActionRulesService, no class-validator here)
-- and is NOT unique — per-user uniqueness, if wanted later, is a separate migration.
-- See docs/monorepo/plan-task-tags-rules-design.md.

ALTER TABLE tag_action_rules ADD COLUMN IF NOT EXISTS title TEXT NOT NULL;

COMMENT ON COLUMN tag_action_rules.title IS 'Human-readable label for the rule, shown as the primary text in the rules list/table and edited on the dedicated create/update routes. Required and non-empty (non-empty enforced in TagActionRulesService); NOT unique. Added NOT NULL with no default because the table was empty at migration time.';
