import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

/**
 * @description Case-insensitive filter over repo skill entries by slug, path,
 * or summary. Hoisted out of AgentsSkillsRegistry per
 * component-primitive-shape R4.
 */
export function filterEntries(
  entries: ReadonlyArray<RepoSkillEntry>,
  query: string,
): RepoSkillEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return [...entries];
  }
  return entries.filter(
    (e) =>
      e.slug.toLowerCase().includes(q) ||
      e.repoRelativePath.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q),
  );
}
