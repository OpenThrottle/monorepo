/**
 * @description Shared types, constants, and pure validation/serialization helpers for the
 * skill-availability authoring UI (posture, rules, tag vocabulary). Kept free of React and I/O so
 * both the client components and the route action can import them. Mirrors the server contract in
 * docs/monorepo/skill-availability-design.md ("Rules", "Surfacing").
 */

/** The single per-project posture (rung 3). `allow` = passthrough minus denies; `deny` = default-deny. */
export const SKILL_AVAILABILITY_POSTURES = ['allow', 'deny'] as const;

export type SkillAvailabilityPosture =
  (typeof SKILL_AVAILABILITY_POSTURES)[number];

/** Environment qualifiers a rule can be scoped to (design "Attribute model"). */
export const SKILL_AVAILABILITY_ENVIRONMENTS = [
  'ci',
  'interactive',
  'ralph',
] as const;

export type SkillAvailabilityEnvironment =
  (typeof SKILL_AVAILABILITY_ENVIRONMENTS)[number];

/**
 * UI sentinel for a rule that applies to every environment (server `environment: null`). Kept
 * distinct from the real environments so the qualifier control can round-trip null.
 */
export const SKILL_AVAILABILITY_ENVIRONMENT_ALL = 'all' as const;

export type SkillAvailabilityEnvironmentChoice =
  typeof SKILL_AVAILABILITY_ENVIRONMENT_ALL | SkillAvailabilityEnvironment;

/** A single per-project rule as edited/rendered in the UI. `id` absent ⇒ an unsaved add form. */
export interface SkillAvailabilityRuleValue {
  readonly environment: SkillAvailabilityEnvironment | null;
  readonly id?: string;
  readonly slugAllow: readonly string[];
  readonly slugDeny: readonly string[];
  readonly tagAllow: readonly string[];
  readonly tagDeny: readonly string[];
}

/** Blank rule used to seed the add form (no id, no entries, every environment). */
export const SKILL_AVAILABILITY_EMPTY_RULE: SkillAvailabilityRuleValue = {
  environment: null,
  slugAllow: [],
  slugDeny: [],
  tagAllow: [],
  tagDeny: [],
};

/** A single tag in the workspace vocabulary. */
export interface SkillTagValue {
  readonly id: string;
  readonly tag: string;
}

/** Kebab-case: lowercase alphanumerics separated by single hyphens (no leading/trailing/double hyphen). */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isKebabCase(value: string): boolean {
  return KEBAB_CASE_PATTERN.test(value);
}

/** Narrow an arbitrary string to a known posture without an `as` cast. */
export function isSkillAvailabilityPosture(
  value: string,
): value is SkillAvailabilityPosture {
  return SKILL_AVAILABILITY_POSTURES.some((known) => known === value);
}

/** Narrow an arbitrary string to a known environment without an `as` cast. */
export function isSkillAvailabilityEnvironment(
  value: string,
): value is SkillAvailabilityEnvironment {
  return SKILL_AVAILABILITY_ENVIRONMENTS.some((known) => known === value);
}

/** Narrow a ToggleGroup value to a known environment choice (the `all` sentinel or a real env). */
export function isSkillAvailabilityEnvironmentChoice(
  value: string,
): value is SkillAvailabilityEnvironmentChoice {
  return (
    value === SKILL_AVAILABILITY_ENVIRONMENT_ALL ||
    isSkillAvailabilityEnvironment(value)
  );
}

/**
 * Parse a free-text slug field (comma- or whitespace-separated) into a deduped, order-preserving
 * list. Empty fragments are dropped; entries are lowercased-as-typed but not otherwise coerced.
 */
export function parseSlugInput(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const fragment of raw.split(/[\s,]+/)) {
    const slug = fragment.trim();
    if (slug !== '' && !seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }
  return result;
}

/** The kebab-case offenders in a slug list (empty ⇒ every entry is valid). */
export function findInvalidSlugs(slugs: readonly string[]): string[] {
  return slugs.filter((slug) => !isKebabCase(slug));
}

/** A rule is empty (and rejected) when all four allow/deny lists are empty. */
export function ruleHasAnyEntry(rule: {
  readonly slugAllow: readonly string[];
  readonly slugDeny: readonly string[];
  readonly tagAllow: readonly string[];
  readonly tagDeny: readonly string[];
}): boolean {
  return (
    rule.slugAllow.length > 0 ||
    rule.slugDeny.length > 0 ||
    rule.tagAllow.length > 0 ||
    rule.tagDeny.length > 0
  );
}

/** Serialize a string list for a hidden form field (round-trips via {@link parseListField}). */
export function serializeList(list: readonly string[]): string {
  return JSON.stringify(list);
}

/**
 * Parse a hidden form field written by {@link serializeList} back into a string array. Anything
 * that is not a JSON array of strings resolves to `[]` — a defensive default for a malformed body.
 */
export function parseListField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((entry): entry is string => typeof entry === 'string');
}

/** Convert the UI environment choice to the server `environment` value (`all` ⇒ null). */
export function environmentChoiceToValue(
  choice: SkillAvailabilityEnvironmentChoice,
): SkillAvailabilityEnvironment | null {
  return choice === SKILL_AVAILABILITY_ENVIRONMENT_ALL ? null : choice;
}

/** Convert a server `environment` value to the UI environment choice (null ⇒ `all`). */
export function environmentValueToChoice(
  value: SkillAvailabilityEnvironment | null,
): SkillAvailabilityEnvironmentChoice {
  return value === null ? SKILL_AVAILABILITY_ENVIRONMENT_ALL : value;
}
