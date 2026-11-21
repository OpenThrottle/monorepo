-- Widen the tag_action_rules.action_type CHECK to every action type the rules engine ships
-- (OT plan 4f4ef365 — rules hierarchy).
--
-- Migration 065 created chk_tag_action_rules_action_type allowing only
-- ('inject-task', 'availability-exception'). TAG_ACTION_TYPES in
-- @openthrottle/openthrottle-skills (src/tag-actions.ts) also exports promote-task-to-plan,
-- and its executor ships, so saving such a rule failed at INSERT. The same plan adds
-- attach-prompt (attach a stored custom_prompts row to a matched plan's agent context), so
-- this widens once for all four rather than once per type.
--
-- Drops and re-adds the constraint with the widened set. Idempotent: re-running is a no-op.

ALTER TABLE tag_action_rules
  DROP CONSTRAINT IF EXISTS chk_tag_action_rules_action_type;

ALTER TABLE tag_action_rules
  ADD CONSTRAINT chk_tag_action_rules_action_type
  CHECK (action_type IN ('attach-prompt', 'availability-exception', 'inject-task', 'promote-task-to-plan'));

COMMENT ON COLUMN tag_action_rules.action_type IS
  'Which ActionExecutor handles the payload: inject-task (require/inject a task into the plan), availability-exception (ephemeral skill-availability resolver inputs on plan-context reads), promote-task-to-plan (promote the plan''s tasks carrying the matched tags into new plans) or attach-prompt (attach a stored custom_prompts row to the plan''s agent context). Enforced by chk_tag_action_rules_action_type.';

COMMENT ON COLUMN tag_action_rules.action_payload IS
  'Typed action parameters, Zod-validated per action_type at write time. inject-task: skillSlug/placement/anchor/templates, placement first|last|before|after with before/after requiring an anchor {taskId|skillSlug|titleMatch}. availability-exception: tagAllow/tagDeny/slugAllow/slugDeny. promote-task-to-plan: an empty object (no options in v1). attach-prompt: exactly one of promptId or filePath, plus promptType (prompts|personas) and an optional placement.';
