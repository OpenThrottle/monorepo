/**
 * @description Pure overlay of the `skillAvailability` GraphQL resolution result
 * onto disk-discovered (and already project-merged) skill entries. Adds the
 * resolved `effectiveDisableModelInvocation` and `provenance` fields, keyed by
 * slug. Disk discovery remains the source of the entry LIST; this only enriches
 * matching rows. When the availability result is empty — the current local
 * reality on a DB with no rules/ingest, or a failed query — entries pass through
 * unchanged and simply lack the resolved fields (the static-only view, exactly
 * today's behavior). See docs/monorepo/skill-availability-design.md
 * ("Surfacing" — effective-first read view).
 */

import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

/**
 * A resolved skill row from the `skillAvailability` query, narrowed to the
 * fields the overlay applies. `effectiveDisableModelInvocation` is the server's
 * decisive per-context flag (`Boolean!`); `provenance` names the decisive rung.
 */
export interface SkillAvailabilityRow {
  readonly effectiveDisableModelInvocation: boolean;
  readonly provenance: string;
  readonly slug: string;
}

export const mergeRepoSkillsWithSkillAvailability = (
  entries: readonly RepoSkillEntry[],
  availability: readonly SkillAvailabilityRow[],
): readonly RepoSkillEntry[] => {
  if (availability.length === 0) {
    return entries;
  }

  const bySlug = new Map<string, SkillAvailabilityRow>(
    availability.map((row) => [row.slug, row]),
  );

  return entries.map((entry) => {
    const row = bySlug.get(entry.slug);
    if (row === undefined) {
      return entry;
    }

    return {
      ...entry,
      effectiveDisableModelInvocation: row.effectiveDisableModelInvocation,
      provenance: row.provenance,
    };
  });
};
