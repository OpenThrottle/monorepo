import type { RepoSkillEntry } from '~/routing/agents/data/data.repo-skills-registry';
import { LAYOUT_PREFERENCE } from '~/routing/agents/data/data.repo-skills-registry';

/**
 * @description Collapses duplicate slugs across editor layouts, preferring `.agents/skills`.
 */
export const dedupeRepoSkillEntriesBySlug = (
  entries: ReadonlyArray<RepoSkillEntry>,
): readonly RepoSkillEntry[] => {
  const bySlug = new Map<string, RepoSkillEntry>();

  for (const entry of entries) {
    const existing = bySlug.get(entry.slug);
    if (!existing) {
      bySlug.set(entry.slug, entry);
      continue;
    }

    if (LAYOUT_PREFERENCE[entry.layout] < LAYOUT_PREFERENCE[existing.layout]) {
      bySlug.set(entry.slug, entry);
    }
  }

  return [...bySlug.values()];
};

/**
 * @description Returns the count of discovered skills under the `.agents/skills`
 * SSOT view, for display next to the skills list.
 */
export const getRepoSkillsRegistryCounts = (
  entries: ReadonlyArray<RepoSkillEntry>,
): { readonly agents: number } => {
  return { agents: entries.length };
};
