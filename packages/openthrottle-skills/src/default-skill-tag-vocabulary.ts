/**
 * @description Platform-default seed for the per-workspace `skill_tags` vocabulary
 * table (each workspace gets its own copy on provisioning and may add/rename/remove
 * tags from there) **and** the CI-only enum source used to validate this monorepo's
 * own `.agents/skills/` corpus. It is deliberately *not* referenced by the shared,
 * permissive `skillFrontmatterSchema` — that schema runs at ingest for external
 * workspace repos too, which must not hard-fail on a tag outside this list (unknown
 * tags degrade gracefully at resolve time instead). See the "Tags" and "Invariants"
 * sections of docs/monorepo/skill-availability-design.md.
 * @public
 */
export const DEFAULT_SKILL_TAG_VOCABULARY = [
  'backend',
  'ci',
  'commit',
  'database',
  'docs',
  'frontend',
  'git',
  'github',
  'infra',
  'nx',
  'openthrottle',
  'planning',
  'pr-review',
  'terraform',
  'testing',
  'ui',
] as const;

/** @public */
export type DefaultSkillTag = (typeof DEFAULT_SKILL_TAG_VOCABULARY)[number];
