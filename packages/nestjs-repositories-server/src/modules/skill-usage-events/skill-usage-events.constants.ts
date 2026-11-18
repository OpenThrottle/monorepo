import type { SkillUsageScope } from './skill-usage-events.types.ts';

/**
 * @description Branches pinned above the alphabetical tail, most-default first. Expressed
 * as a SQL rank so the pin survives the LIMIT: `main` wins when both are present,
 * `master` is pinned when it is the only one in the window.
 * @public
 */
export const SKILL_USAGE_DEFAULT_BRANCHES = ['main', 'master'] as const;

/**
 * @description Who a captured invocation belongs to. The canonical declaration — enforced
 * in Postgres by `skill_usage_events_scope_check`, mirrored (deliberately, to
 * avoid a React Router app importing from a NestJS package) by
 * `SKILL_USAGE_SCOPES` in
 * `applications/openthrottle-developer/app/routing/usage/data/data.skill-usage-copy.ts`,
 * and by the `Scope` union in `packages/agentic-hooks/src/types.ts` which the
 * capture hooks bundle. Widening the vocabulary means touching all three.
 *
 * `personal` = authored by the invoking user under their personal skills root
 * (`~/.openthrottle/skills` / `OPENTHROTTLE_PERSONAL_SKILLS_DIR`): on disk and
 * invokable, but outside the repo, so nobody else's checkout has it.
 *
 * `injected` = authored under ANOTHER repository's `skills/<name>/` and linked
 * into this one by foreign skill injection (OT plan 25f11313): an OpenThrottle
 * skill used in a workspace that does not author it.
 *
 * Distinct from the `/agents` registry provenance vocabulary
 * (`committed | installed | external`), which answers where the file came from
 * rather than who the invocation belongs to. The two are deliberately not
 * unified.
 * @public
 */
export const SKILL_USAGE_SCOPES = {
  INJECTED: 'injected',
  OURS: 'ours',
  PERSONAL: 'personal',
  THIRD_PARTY: 'third-party',
} as const;

/**
 * @description Human-readable member list for validation messages, e.g.
 * `scope must be one of: ours, personal, third-party`. Generated from the
 * const so an error message can never name a stale vocabulary.
 * @public
 */
export const SKILL_USAGE_SCOPE_LIST =
  Object.values(SKILL_USAGE_SCOPES).join(', ');

/**
 * @description The per-day aggregate column each scope counts into. Exhaustive over the
 * scope union on purpose: this `Record` is the gate that makes adding a fourth
 * member a compile error here instead of a silently dropped series in the
 * chart, which is exactly how `personal` went uncounted.
 * @public
 */
export const SKILL_USAGE_SCOPE_COUNT_KEYS = {
  [SKILL_USAGE_SCOPES.INJECTED]: 'injectedCount',
  [SKILL_USAGE_SCOPES.OURS]: 'oursCount',
  [SKILL_USAGE_SCOPES.PERSONAL]: 'personalCount',
  [SKILL_USAGE_SCOPES.THIRD_PARTY]: 'thirdPartyCount',
} as const satisfies Record<SkillUsageScope, string>;

/**
 * @description How much of a skill invocation's args the client kept before sending.
 * @public
 */
export const SKILL_USAGE_PRIVACY_LEVELS = {
  FULL: 'full',
  NAME_ONLY: 'name-only',
  TRUNCATED: 'truncated',
} as const;
