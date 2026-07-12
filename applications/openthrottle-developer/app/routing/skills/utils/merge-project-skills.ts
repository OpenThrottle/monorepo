/**
 * @description Pure merge of the `projectSkills` GraphQL flag+tags onto the
 * disk-discovered skill entries. Disk discovery stays the source of the entry
 * LIST (which skills exist, their order, summary, path); a matching GraphQL row
 * (keyed by slug) wins for `disableModelInvocation` and `tags`. When the
 * GraphQL result is empty — the current local reality on a DB that has not been
 * migrated/ingested — disk entries pass through unchanged, which is the Skills
 * loader's silent fallback. See docs/monorepo/skill-availability-design.md
 * ("Surfacing" — display-only quick win).
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

/**
 * A per-project skill row from the `projectSkills` query, narrowed to the fields
 * the merge overlays. `staticDisableModelInvocation` is the server's tri-state
 * (`null` = frontmatter omits the key).
 */
export interface ProjectSkillFlagRow {
  readonly slug: string;
  readonly staticDisableModelInvocation?: boolean | null;
  readonly tags: readonly string[];
}

export const mergeRepoSkillsWithProjectSkills = (
  entries: readonly RepoSkillEntry[],
  projectSkills: readonly ProjectSkillFlagRow[],
): readonly RepoSkillEntry[] => {
  if (projectSkills.length === 0) {
    return entries;
  }

  const bySlug = new Map<string, ProjectSkillFlagRow>(
    projectSkills.map((row) => [row.slug, row]),
  );

  return entries.map((entry) => {
    const row = bySlug.get(entry.slug);
    if (row === undefined) {
      return entry;
    }

    return {
      ...entry,
      disableModelInvocation: row.staticDisableModelInvocation ?? undefined,
      tags: row.tags,
    };
  });
};
