/**
 * @description Shared shape for the create-a-skill flow: the three destinations
 * a new SKILL.md can land in, and the form field names the route action reads.
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
 * - `custom` — `<monorepo root>/.agents/skills/<slug>/SKILL.md`, a real
 *   directory in YOUR repository, committed with it. The end user's own tier.
 * - `openthrottle` — `<monorepo root>/skills/<slug>/SKILL.md`, OpenThrottle's
 *   committed catalog. Meaningful only when working ON OpenThrottle, so it is
 *   gated behind `FEATURE_BETA_PREVIEW` in the UI and refused server-side when
 *   the flag is off.
 *
 * `openthrottle` was called `repo` until the custom tier landed: with three
 * destinations all writing into a repository, "repo" no longer names which one.
 */
export const SKILL_CREATE_DESTINATIONS = {
  custom: 'custom',
  openthrottle: 'openthrottle',
  personal: 'personal',
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
  value === SKILL_CREATE_DESTINATIONS.custom ||
  value === SKILL_CREATE_DESTINATIONS.openthrottle ||
  value === SKILL_CREATE_DESTINATIONS.personal;

/**
 * @description Whether a narrowed destination may actually be used, given the
 * beta-preview flag. Only the OpenThrottle catalog is gated: writing into
 * OpenThrottle's own `skills/` is meaningful when working ON OpenThrottle and
 * an invitation to write into someone else's catalog otherwise.
 *
 * Pure and flag-in-hand rather than reading `FEATURE_BETA_PREVIEW` itself: the
 * flag is a module-level const resolved at import time, so a predicate that
 * closed over it could only ever be tested in one state. The route action
 * supplies the real flag — hiding the button is an affordance, this is the
 * guard, and a hand-crafted POST only ever meets the guard.
 */
export const isSkillCreateDestinationAvailable = (
  destination: SkillCreateDestination,
  betaPreviewEnabled: boolean,
): boolean =>
  destination !== SKILL_CREATE_DESTINATIONS.openthrottle || betaPreviewEnabled;

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
