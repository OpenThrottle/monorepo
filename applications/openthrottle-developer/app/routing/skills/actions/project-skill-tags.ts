/**
 * @description Route actions for attaching/detaching domain tags on a
 * project_skills row and for explicitly removing an orphan row.
 */

import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import {
  AddProjectSkillTagDocument,
  RemoveProjectSkillDocument,
  RemoveProjectSkillTagDocument,
} from '~/__generated__/graphql';
import { AddProjectSkillTagInputSchema } from '~/__generated__/schemas';
import { toErrorMessage } from '~/global/utils/utils.error-message';

/** Skill-tag forms label their `slug` field as "Skill slug" in error copy. */
const SKILL_TAG_LABELS = { slug: 'Skill slug' } as const;

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
  const parsed = parseFormData(
    formData,
    AddProjectSkillTagInputSchema().omit({ projectId: true }),
    { labels: SKILL_TAG_LABELS, strict: false },
  );
  if (!parsed.success) {
    return { error: parsed.error, intent };
  }

  return { slug: parsed.data.slug, tag: parsed.data.tag };
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
      const parsed = parseFormData(
        formData,
        z.object({ slug: z.string().min(1) }),
        { labels: SKILL_TAG_LABELS, strict: false },
      );
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(request, RemoveProjectSkillDocument, {
        slug: parsed.data.slug,
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
