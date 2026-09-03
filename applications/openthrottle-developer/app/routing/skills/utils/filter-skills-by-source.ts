/**
 * @description Client-side source filter for the skills index: narrows the
 * loaded entries to a provenance segment (All / Custom / External /
 * OpenThrottle / Personal) without re-querying — the toolbar drives it over
 * the loader's merged list.
 *
 * Backend `SkillSource` is only `external | openthrottle` (ingested and served
 * over GraphQL). Personal and Custom are local overlays (`isPersonal`,
 * `isCustom`), not server enum values: both still carry `source: 'external'`
 * because neither is authored in `skills/`, and showing either under External
 * is how it gets mistaken for a third-party dependency. Personal lives outside
 * the repo and can never be committed; Custom is authored inside this
 * repository and is committed with it. {@link getSkillSourceKind} is the
 * four-way classification both the filter and the source badge switch on.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export const SKILL_SOURCE_KINDS = [
  'custom',
  'external',
  'openthrottle',
  'personal',
] as const;

export type SkillSourceKind = (typeof SKILL_SOURCE_KINDS)[number];

export const SKILL_SOURCE_FILTERS = ['all', ...SKILL_SOURCE_KINDS] as const;

export type SkillSourceFilter = (typeof SKILL_SOURCE_FILTERS)[number];

export const isSkillSourceFilter = (
  value: string,
): value is SkillSourceFilter =>
  SKILL_SOURCE_FILTERS.some((filter) => filter === value);

/**
 * @description Coerce a raw `?source=` value into a filter token. Missing,
 * empty, and unknown values all fall back to `all` — a shared link with a
 * stale or hand-edited param renders the full list rather than 404ing.
 *
 * @public
 */
export const parseSkillSourceFilter = (
  value: null | string | undefined,
): SkillSourceFilter =>
  value != null && isSkillSourceFilter(value) ? value : 'all';

/**
 * @description Four-way provenance for display and filtering. Both overlays
 * outrank `source` because a personal- or custom-tier skill is stored as
 * `external`. A skill is never both, but the order is explicit rather than
 * resting on that.
 */
export const getSkillSourceKind = (
  entry: Pick<RepoSkillEntry, 'isCustom' | 'isPersonal' | 'source'>,
): SkillSourceKind => {
  if (entry.isPersonal === true) {
    return 'personal';
  }

  if (entry.isCustom === true) {
    return 'custom';
  }

  return entry.source === 'openthrottle' ? 'openthrottle' : 'external';
};

export const filterSkillsBySource = (
  entries: readonly RepoSkillEntry[],
  filter: SkillSourceFilter,
): readonly RepoSkillEntry[] => {
  if (filter === 'all') {
    return entries;
  }

  return entries.filter((entry) => getSkillSourceKind(entry) === filter);
};
