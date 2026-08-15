/**
 * @description Merge of `projectSkills` GraphQL rows with disk-discovered skill
 * entries. Disk entries stay the primary list (order, summary, path); a matching
 * GraphQL row (keyed by slug) wins for `disableModelInvocation`, `tags`, and —
 * when it carries a recognized value — `source`/`sourceUrl`. GraphQL slugs that
 * are absent from disk are appended as orphan rows so the UI can suggest remove.
 * When the GraphQL result is empty — a DB that has not been migrated/ingested —
 * disk entries pass through unchanged. See
 * docs/monorepo/skill-availability-design.md ("Surfacing").
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
  /**
   * When ingest last found this slug missing from disk. Present on DB-only
   * orphan rows; `null`/`undefined` while the skill is still on disk.
   */
  readonly orphanedAt?: Date | string | null;
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

  const mergedDisk = entries.map((entry): RepoSkillEntry => {
    const row = bySlug.get(entry.slug);
    if (row === undefined) {
      return entry;
    }

    // The ingested row wins for provenance when it carries a recognized
    // value; the disk-parsed source stays otherwise. The `row.source` checks
    // stay inline so TypeScript narrows the string to the `SkillSource` union.
    return {
      ...entry,
      disableModelInvocation: row.staticDisableModelInvocation ?? undefined,
      orphanedAt: undefined,
      source:
        row.source === 'external' || row.source === 'openthrottle'
          ? row.source
          : entry.source,
      sourceUrl:
        row.source === 'external' || row.source === 'openthrottle'
          ? (row.sourceUrl ?? undefined)
          : entry.sourceUrl,
      tags: row.tags,
    };
  });

  const diskSlugs = new Set(entries.map((entry) => entry.slug));
  const orphans = projectSkills
    .filter((row) => !diskSlugs.has(row.slug))
    .map(toOrphanEntry)
    .sort((left, right) => left.slug.localeCompare(right.slug));

  return orphans.length === 0 ? mergedDisk : [...mergedDisk, ...orphans];
};

const toOrphanEntry = (row: ProjectSkillFlagRow): RepoSkillEntry => ({
  disableModelInvocation: row.staticDisableModelInvocation ?? undefined,
  layout: 'agents',
  orphanedAt: row.orphanedAt ?? new Date(0),
  repoRelativePath: '',
  slug: row.slug,
  source: row.source === 'openthrottle' ? 'openthrottle' : 'external',
  sourceUrl: row.sourceUrl ?? undefined,
  summary: row.description ?? '',
  tags: row.tags,
});
