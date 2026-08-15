/**
 * @description Route actions for attaching/detaching domain tags on a
 * project_skills row and for explicitly removing an orphan row.
 */

import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AddProjectSkillTagDocument,
  RemoveProjectSkillDocument,
  RemoveProjectSkillTagDocument,
} from '~/__generated__/graphql';
import { toErrorMessage } from '~/global/utils/utils.error-message';

export const SKILL_RECORD_TAG_INTENTS = {
  ADD_TAG: 'addProjectSkillTag',
  REMOVE_ORPHAN: 'removeProjectSkill',
  REMOVE_TAG: 'removeProjectSkillTag',
} as const;

export type SkillRecordTagIntent =
  (typeof SKILL_RECORD_TAG_INTENTS)[keyof typeof SKILL_RECORD_TAG_INTENTS];

export interface SkillRecordTagActionResult {
  readonly error?: string;
  readonly intent: string;
  readonly ok?: boolean;
}

const readSlugAndTag = (
  formData: FormData,
):
  | { readonly slug: string; readonly tag: string }
  | SkillRecordTagActionResult => {
  const intentField = formData.get('intent');
  const intent = typeof intentField === 'string' ? intentField : '';
  const slugField = formData.get('slug');
  const tagField = formData.get('tag');
  const slug = typeof slugField === 'string' ? slugField.trim() : '';
  const tag = typeof tagField === 'string' ? tagField.trim() : '';

  if (slug === '') {
    return { error: 'Skill slug is required.', intent };
  }
  if (tag === '') {
    return { error: 'Tag is required.', intent };
  }

  return { slug, tag };
};

/**
 * @description Dispatches add/remove tag and orphan-remove intents. Used by
 * `/skills` and `/skills/:slug` so the table and detail share one write path.
 */
export const runSkillRecordTagAction = async (
  request: Request,
  formData: FormData,
): Promise<SkillRecordTagActionResult> => {
  const intentField = formData.get('intent');
  const intent = typeof intentField === 'string' ? intentField : '';

  try {
    if (intent === SKILL_RECORD_TAG_INTENTS.ADD_TAG) {
      const parsed = readSlugAndTag(formData);
      if (!('slug' in parsed)) {
        return parsed;
      }
      await executeGraphqlWithAuth(request, AddProjectSkillTagDocument, {
        input: { slug: parsed.slug, tag: parsed.tag },
      });
      return { intent, ok: true };
    }

    if (intent === SKILL_RECORD_TAG_INTENTS.REMOVE_TAG) {
      const parsed = readSlugAndTag(formData);
      if (!('slug' in parsed)) {
        return parsed;
      }
      await executeGraphqlWithAuth(request, RemoveProjectSkillTagDocument, {
        input: { slug: parsed.slug, tag: parsed.tag },
      });
      return { intent, ok: true };
    }

    if (intent === SKILL_RECORD_TAG_INTENTS.REMOVE_ORPHAN) {
      const slugField = formData.get('slug');
      const slug = typeof slugField === 'string' ? slugField.trim() : '';
      if (slug === '') {
        return { error: 'Skill slug is required.', intent };
      }
      await executeGraphqlWithAuth(request, RemoveProjectSkillDocument, {
        slug,
      });
      return { intent, ok: true };
    }

    return { error: `Unknown intent "${intent}".`, intent };
  } catch (error) {
    return {
      error: toErrorMessage(error, 'Failed to update skill tags.'),
      intent,
    };
  }
};
