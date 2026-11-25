/**
 * @description Client-side text filter for the skills index: narrows the loaded
 * entries to those whose slug, on-disk path, or summary contain the committed
 * `?search=` query (case-insensitive substring). Runs over the loader's merged
 * list — no re-query — and composes after {@link filterSkillsBySource}.
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

export const filterSkillsByQuery = (
  entries: readonly RepoSkillEntry[],
  query: string,
): readonly RepoSkillEntry[] => {
  const needle = query.trim().toLowerCase();

  if (needle === '') {
    return entries;
  }

  return entries.filter(
    (entry) =>
      entry.slug.toLowerCase().includes(needle) ||
      entry.repoRelativePath.toLowerCase().includes(needle) ||
      entry.summary.toLowerCase().includes(needle),
  );
};
