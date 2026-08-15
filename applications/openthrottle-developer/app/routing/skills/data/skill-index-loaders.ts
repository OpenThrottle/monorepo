/**
 * @description Loader data-fetch helpers for the /skills index. Hoisted out of
 * the route module per the route primitive shape (R3). Both are resilient by
 * contract: any failure (DB not migrated/ingested, GraphQL down, auth) yields
 * an empty list so the loader silently falls back to the disk-parsed values.
 * Neither throws.
 */

import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  ProjectSkillsDocument,
  SkillAvailabilityDocument,
  SkillsRecordTagVocabularyDocument,
} from '~/__generated__/graphql';
import { type ProjectSkillFlagRow } from '~/routing/skills/utils/merge-project-skills';
import { type SkillAvailabilityRow } from '~/routing/skills/utils/merge-skill-availability';

/** Fetches the `projectSkills` static flag+tags for the merge. Never throws. */
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
 * Fetches the per-context resolved availability (effective flag + provenance)
 * from the `skillAvailability` surface (`environment: interactive`, the
 * developer-app context). Resolve-time `warnings` are logged server-side and
 * dropped from the UI. Never throws.
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

    if (skillAvailability.warnings.length > 0) {
      console.warn(
        `[skills] skillAvailability resolve warnings: ${skillAvailability.warnings.join(', ')}`,
      );
    }

    return skillAvailability.skills;
  } catch {
    return [];
  }
};

/**
 * @description Loads the caller's skill-tag vocabulary (domain + phase). Never
 * throws — an empty list disables add-tag options until the query succeeds.
 */
export const loadSkillTagVocabulary = async (
  request: Request,
): Promise<readonly { readonly dimension: string; readonly tag: string }[]> => {
  try {
    const { skillTagVocabulary } = await executeGraphqlWithAuth(
      request,
      SkillsRecordTagVocabularyDocument,
    );
    return skillTagVocabulary.tags.map((entry) => ({
      dimension: entry.dimension,
      tag: entry.tag,
    }));
  } catch {
    return [];
  }
};
