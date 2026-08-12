/**
 * @description Pure merge of the `projectSkills` GraphQL flag+tags onto the
 * disk-discovered skill entries. Disk discovery stays the source of the entry
 * LIST (which skills exist, their order, summary, path); a matching GraphQL row
 * (keyed by slug) wins for `disableModelInvocation`, `tags`, and — when it
 * carries a recognized value — `source`/`sourceUrl`. When the
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
  /**
   * Ingested frontmatter description; `null` when the ingested row omits it.
   * Used only by the deployed-app fallback in the `/skills/autocomplete` route
   * when filesystem discovery is unavailable (no local checkout). The disk-first
   * merge does not read it — disk `summary` wins there.
   */
  readonly description?: string | null;
  readonly slug: string;
  /**
   * Ingested provenance (`openthrottle` | `external`); any other/absent value
   * leaves the disk-parsed source in place.
   */
  readonly source?: string;
  /** Ingested origin URL; `null` when the ingested frontmatter omitted it. */
  readonly sourceUrl?: string | null;
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
      // The ingested row wins for provenance when it carries a recognized
      // value; the disk-parsed source stays otherwise.
      ...(row.source === 'external' || row.source === 'openthrottle'
        ? { source: row.source, sourceUrl: row.sourceUrl ?? undefined }
        : {}),
      tags: row.tags,
    };
  });
};
