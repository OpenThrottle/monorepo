/**
 * @description Client-side source filter for the skills index: narrows the
 * loaded entries to a provenance segment (All / OpenThrottle / External /
 * Personal) without re-querying — the toolbar drives it over the loader's
 * merged list.
 *
 * Backend `SkillSource` is only `external | openthrottle` (ingested and served
 * over GraphQL). Personal is a local overlay (`isPersonal`), not a server enum:
 * a personal skill still carries `source: 'external'` because it is not
 * authored in `skills/`, but it is yours, from outside the repo, and showing
 * it under External is how it gets mistaken for a third-party dependency.
 * {@link getSkillSourceKind} is the three-way classification both the filter
 * and the source badge switch on.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export const SKILL_SOURCE_KINDS = [
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
 * @description Three-way provenance for display and filtering. Personal
 * outranks `source` because a personal-tier skill is stored as `external`.
 */
export const getSkillSourceKind = (
  entry: Pick<RepoSkillEntry, 'isPersonal' | 'source'>,
): SkillSourceKind => {
  if (entry.isPersonal === true) {
    return 'personal';
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
