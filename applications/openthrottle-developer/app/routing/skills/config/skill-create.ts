/**
 * @description Shared shape for the create-a-skill flow: the two destinations a
 * new SKILL.md can land in, and the form field names the route action reads.
 *
 * Client and server both import this so the posted value and the value the
 * action narrows are the same literal union by construction. `as const` object
 * rather than an enum, per the repo's TypeScript rules.
 */

/**
 * @description Where a newly created skill is written.
 *
 * - `personal` — `<personal root>/<slug>/SKILL.md`, outside the repo, linked in
 *   as a gitignored symlink. Uncommittable by design.
 * - `repo` — `<monorepo root>/skills/<slug>/SKILL.md`, the committed catalog.
 */
export const SKILL_CREATE_DESTINATIONS = {
  personal: 'personal',
  repo: 'repo',
} as const;

export type SkillCreateDestination =
  (typeof SKILL_CREATE_DESTINATIONS)[keyof typeof SKILL_CREATE_DESTINATIONS];

/** The destination selected when the form first opens. */
export const DEFAULT_SKILL_CREATE_DESTINATION: SkillCreateDestination =
  SKILL_CREATE_DESTINATIONS.personal;

/**
 * @description Narrows an untrusted form value to a destination. Anything else
 * — a missing field, a typo, a hand-crafted POST — is refused rather than
 * defaulted, so a malformed request can never silently write to the repo.
 */
export const isSkillCreateDestination = (
  value: unknown,
): value is SkillCreateDestination =>
  value === SKILL_CREATE_DESTINATIONS.personal ||
  value === SKILL_CREATE_DESTINATIONS.repo;

/** Form field names, shared by the form and the action that parses it. */
export const SKILL_CREATE_FIELDS = {
  content: 'content',
  destination: 'destination',
  slug: 'slug',
} as const;

/**
 * @description Kebab-case slug pattern for a new skill directory.
 *
 * Mirrors `AGENT_ASSET_SLUG_PATTERN` from `@openthrottle/openthrottle-skills`
 * rather than re-exporting it: that package's barrel also exports
 * `discoverSkillDirs`, whose module-level `node:fs` import lands in the client
 * bundle via any client import of the barrel — the browser then throws
 * `Module "node:fs" has been externalized for browser compatibility`. Keeping a
 * client-safe copy here is the boundary; `__tests__/skill-create.test.ts` fails
 * if the two ever drift.
 */
export const SKILL_CREATE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
