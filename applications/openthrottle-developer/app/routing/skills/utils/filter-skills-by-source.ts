/**
 * @description Client-side source filter for the skills index: narrows the
 * loaded entries to a provenance segment (All / OpenThrottle / External)
 * without re-querying — the toolbar drives it over the loader's merged list.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export const SKILL_SOURCE_FILTERS = [
  'all',
  'external',
  'openthrottle',
] as const;

export type SkillSourceFilter = (typeof SKILL_SOURCE_FILTERS)[number];

export const isSkillSourceFilter = (
  value: string,
): value is SkillSourceFilter =>
  SKILL_SOURCE_FILTERS.some((filter) => filter === value);

export const filterSkillsBySource = (
  entries: readonly RepoSkillEntry[],
  filter: SkillSourceFilter,
): readonly RepoSkillEntry[] =>
  filter === 'all'
    ? entries
    : entries.filter((entry) => entry.source === filter);
