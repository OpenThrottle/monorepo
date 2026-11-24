-- Rename the 'ralph' agent environment to 'headless' (OT plan 624a1036, decision Q7).
--
-- An agent runs in one of three environments: ci, interactive (a person driving an agent session such as
-- /ot-loop), or the one a plan run spawned. The Ralph runner is retired, so the third is named for what it
-- is: a headless run. tag_action_rules and skill_availability_rules scope a rule to an environment, so
-- both CHECK constraints swap 'ralph' for 'headless' and existing rows move with them.
--
-- Idempotent: the constraint is dropped and re-added, and the UPDATE matches nothing once it has run.

ALTER TABLE tag_action_rules
  DROP CONSTRAINT IF EXISTS chk_tag_action_rules_environment;

UPDATE tag_action_rules SET environment = 'headless' WHERE environment = 'ralph';

ALTER TABLE tag_action_rules
  ADD CONSTRAINT chk_tag_action_rules_environment CHECK (environment IN ('ci', 'headless', 'interactive'));

ALTER TABLE skill_availability_rules
  DROP CONSTRAINT IF EXISTS chk_skill_availability_rules_environment;

UPDATE skill_availability_rules SET environment = 'headless' WHERE environment = 'ralph';

ALTER TABLE skill_availability_rules
  ADD CONSTRAINT chk_skill_availability_rules_environment CHECK (environment IN ('ci', 'headless', 'interactive'));

COMMENT ON COLUMN tag_action_rules.environment IS 'Optional environment qualifier: NULL applies to every environment; a value (ci | headless | interactive) scopes the rule to that environment. headless is an agent spawned by a plan run.';

COMMENT ON COLUMN skill_availability_rules.environment IS 'Environment qualifier (rung 0 pre-filter): NULL applies to all environments; a value (ci | headless | interactive) scopes the rule to that environment. headless is an agent spawned by a plan run.';
