/**
 * @description Client-side source filter for the skills index: narrows the
 * loaded entries to a provenance segment (All / OpenThrottle / External /
 * Personal) without re-querying — the toolbar drives it over the loader's
 * merged list.
 *
 * Personal is its own segment rather than a slice of External. A personal skill
 * carries `source: 'external'` (it is not authored in `skills/`), but it is not
 * somebody else's install — it is yours, from outside the repo, and showing it
 * under External is how it gets mistaken for a third-party dependency.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export const SKILL_SOURCE_FILTERS = [
  'all',
  'external',
  'openthrottle',
  'personal',
] as const;

export type SkillSourceFilter = (typeof SKILL_SOURCE_FILTERS)[number];

export const isSkillSourceFilter = (
  value: string,
): value is SkillSourceFilter =>
  SKILL_SOURCE_FILTERS.some((filter) => filter === value);

export const filterSkillsBySource = (
  entries: readonly RepoSkillEntry[],
  filter: SkillSourceFilter,
): readonly RepoSkillEntry[] => {
  if (filter === 'all') {
    return entries;
  }

  if (filter === 'personal') {
    return entries.filter((entry) => entry.isPersonal === true);
  }

  // Personal entries are excluded from every other segment, so a skill appears
  // in exactly one — otherwise External silently doubles as "yours and theirs".
  return entries.filter(
    (entry) => entry.isPersonal !== true && entry.source === filter,
  );
};
