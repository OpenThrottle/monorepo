/**
 * @description Vocabulary axis for a tag: `domain` (subject area; the only dimension
 * skills may carry) or `phase` (plan/task lifecycle stage; never attaches to skills).
 * Mirrors the `dimension` CHECK on `user_skill_tags`, `plan_tags`, and `task_tags`.
 * See docs/monorepo/plan-task-tags-rules-design.md ("One vocabulary, two dimensions").
 * @public
 */
export type SkillTagDimension = 'domain' | 'phase';

/**
 * @description Platform-default seed for the DOMAIN dimension of the per-user
 * `user_skill_tags` vocabulary (each user's copy seeds on first read and may be
 * edited from there) **and** the CI-only enum source used to validate this
 * monorepo's own `.agents/skills/` corpus. It is deliberately *not* referenced by
 * the shared, permissive `skillFrontmatterSchema` — that schema runs at ingest for
 * external workspace repos too, which must not hard-fail on a tag outside this list
 * (unknown tags degrade gracefully at resolve time instead). See the "Tags" and
 * "Invariants" sections of docs/monorepo/skill-availability-design.md.
 * @public
 */
export const DEFAULT_DOMAIN_TAG_VOCABULARY = [
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

/**
 * @description Platform-default seed for the PHASE dimension of the per-user
 * vocabulary: plan/task lifecycle stages matched by tag→action rules (e.g. the
 * breakdown → /grill-me inject rule). Phase tags attach to plans and tasks only —
 * never to skills — and at most one phase tag may be present per plan
 * (service-enforced). See docs/monorepo/plan-task-tags-rules-design.md.
 * @public
 */
export const DEFAULT_PHASE_TAG_VOCABULARY = [
  'breakdown',
  'design',
  'implementation',
  'maintenance',
  'research',
] as const;

/**
 * @description Back-compat alias for the domain list: before the dimension split
 * this was the whole vocabulary. Existing consumers (CI corpus validation, per-user
 * seeding of domain tags) keep working unchanged; new code should prefer the
 * explicit `DEFAULT_DOMAIN_TAG_VOCABULARY` / `DEFAULT_PHASE_TAG_VOCABULARY` names.
 * @public
 */
export const DEFAULT_SKILL_TAG_VOCABULARY = DEFAULT_DOMAIN_TAG_VOCABULARY;

/** @public */
export type DefaultDomainTag = (typeof DEFAULT_DOMAIN_TAG_VOCABULARY)[number];

/** @public */
export type DefaultPhaseTag = (typeof DEFAULT_PHASE_TAG_VOCABULARY)[number];

/** @public */
export type DefaultSkillTag = DefaultDomainTag;

/**
 * @description One entry of the combined, dimensioned vocabulary seed.
 * @public
 */
export interface DefaultTagVocabularyEntry {
  dimension: SkillTagDimension;
  tag: string;
}

/**
 * @description The combined `{ tag, dimension }[]` seed for `user_skill_tags`:
 * every default domain tag plus every default phase tag. This is what first-read
 * vocabulary seeding (and the tagging service-account bootstrap) should insert.
 * @public
 */
export const DEFAULT_TAG_VOCABULARY_SEED: readonly DefaultTagVocabularyEntry[] =
  [
    ...DEFAULT_DOMAIN_TAG_VOCABULARY.map((tag): DefaultTagVocabularyEntry => ({
      dimension: 'domain',
      tag,
    })),
    ...DEFAULT_PHASE_TAG_VOCABULARY.map((tag): DefaultTagVocabularyEntry => ({
      dimension: 'phase',
      tag,
    })),
  ];
