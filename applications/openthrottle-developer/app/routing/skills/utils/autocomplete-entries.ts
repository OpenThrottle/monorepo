import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  ProjectSkillsDocument,
  SkillAvailabilityDocument,
} from '~/__generated__/graphql';
import {
  mergeRepoSkillsWithProjectSkills,
  type ProjectSkillFlagRow,
} from '~/routing/skills/utils/merge-project-skills';
import {
  mergeRepoSkillsWithSkillAvailability,
  type SkillAvailabilityRow,
} from '~/routing/skills/utils/merge-skill-availability';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';

/** One skill offered to the composer's `/`-command provider. */
export interface SkillAutocompleteEntry {
  /** Frontmatter description (`RepoSkillEntry.summary`); shown muted in the popover. */
  readonly description: string;
  /**
   * Effective per-context `disable-model-invocation`: `true` = the model may not
   * auto-invoke this skill. It stays user-selectable via `/`; the popover marks
   * it rather than dropping it.
   */
  readonly disabledForModel: boolean;
  /** Command slug inserted after `/`. */
  readonly slug: string;
  /** Static frontmatter tags (empty when none). */
  readonly tags: readonly string[];
}

/** JSON shape returned to the composer's `/`-command skill provider. */
export interface SkillsAutocompleteResponse {
  /** The `q` echoed back (empty for an unfiltered listing). */
  readonly query: string;
  /** Skills (filtered + capped when `q` is present). */
  readonly skills: readonly SkillAutocompleteEntry[];
  /** True when matches were dropped by the result cap. */
  readonly truncated: boolean;
}

/**
 * Resilient by contract: any failure (DB not migrated/ingested, GraphQL down,
 * auth) yields an empty list so the loader silently falls back to the
 * disk-parsed values. Never throws. Mirrors `skills._index`.
 */
export const loadProjectSkillFlags = async (
  request: Request,
): Promise<readonly ProjectSkillFlagRow[]> => {
  try {
    const { projectSkills } = await executeGraphqlWithAuth(
      request,
      ProjectSkillsDocument,
    );
    return projectSkills.skills;
  } catch {
    return [];
  }
};

/**
 * Resilient by contract: any failure yields empty resolved rows so the loader
 * silently falls back to the static-only view. Never throws. Mirrors
 * `skills._index` (`environment: interactive`, the developer-app context).
 */
export const loadSkillAvailability = async (
  request: Request,
): Promise<readonly SkillAvailabilityRow[]> => {
  try {
    const { skillAvailability } = await executeGraphqlWithAuth(
      request,
      SkillAvailabilityDocument,
      { environment: 'interactive' },
    );
    return skillAvailability.skills;
  } catch {
    return [];
  }
};

/** Map a merged repo-skill entry to the compact autocomplete shape. */
export const toAutocompleteEntry = (
  entry: RepoSkillEntry,
): SkillAutocompleteEntry => ({
  description: entry.summary,
  // Human `/` invocation is never gated; this flag only marks model auto-invoke.
  disabledForModel:
    entry.effectiveDisableModelInvocation ??
    entry.disableModelInvocation ??
    false,
  slug: entry.slug,
  tags: entry.tags ?? [],
});

/**
 * Build the autocomplete list from the GraphQL `projectSkills` rows (description
 * carried over the wire), overlaying the per-context effective flag from
 * `skillAvailability`. Used when filesystem discovery is unavailable (a deployed
 * app with no local checkout), so the menu still works from ingested data.
 */
export const fromProjectSkills = (
  projectSkills: readonly ProjectSkillFlagRow[],
  availability: readonly SkillAvailabilityRow[],
): readonly SkillAutocompleteEntry[] => {
  const effectiveBySlug = new Map(
    availability.map((row) => [row.slug, row.effectiveDisableModelInvocation]),
  );
  return projectSkills.map((row) => ({
    description: row.description ?? '',
    disabledForModel:
      effectiveBySlug.get(row.slug) ??
      row.staticDisableModelInvocation ??
      false,
    slug: row.slug,
    tags: [...row.tags],
  }));
};

/**
 * Compose the autocomplete skill list from filesystem discovery (primary,
 * carries descriptions) merged with the static `projectSkills` flags/tags and
 * the per-context `skillAvailability`. Falls back to the ingested rows when
 * filesystem discovery is unavailable (deployed app, no checkout).
 */
export const composeAutocompleteSkills = (
  diskEntries: readonly RepoSkillEntry[],
  projectSkills: readonly ProjectSkillFlagRow[],
  availability: readonly SkillAvailabilityRow[],
): readonly SkillAutocompleteEntry[] =>
  diskEntries.length === 0
    ? fromProjectSkills(projectSkills, availability)
    : mergeRepoSkillsWithSkillAvailability(
        mergeRepoSkillsWithProjectSkills(diskEntries, projectSkills),
        availability,
      ).map(toAutocompleteEntry);
