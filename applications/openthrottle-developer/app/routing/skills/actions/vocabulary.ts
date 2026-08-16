import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import type { ActionFunctionArgs } from 'react-router';
import {
  AddSkillTagDocument,
  RemoveSkillTagDocument,
  RenameSkillTagDocument,
} from '~/__generated__/graphql';
import {
  AddSkillTagInputSchema,
  RemoveSkillTagInputSchema,
  RenameSkillTagInputSchema,
} from '~/__generated__/schemas';

export interface VocabularyActionResult {
  readonly error?: string;
  readonly intent: string;
  readonly ok?: boolean;
}

/**
 * @description Tag-vocabulary mutations (add/rename/remove), dispatched by `intent`.
 * Lifted verbatim from the availability action so the standalone `/skills/vocabulary`
 * route owns the management surface; the availability page keeps only the read query.
 */
export const runVocabularyAction = async (
  args: ActionFunctionArgs,
): Promise<VocabularyActionResult> => {
  const formData = await args.request.formData();
  const intentField = formData.get('intent');
  const intent = typeof intentField === 'string' ? intentField : '';

  try {
    if (intent === 'addTag') {
      const parsed = parseFormData(formData, AddSkillTagInputSchema());
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(args.request, AddSkillTagDocument, {
        input: parsed.data,
      });
      return { intent, ok: true };
    }

    if (intent === 'renameTag') {
      const parsed = parseFormData(formData, RenameSkillTagInputSchema(), {
        labels: { from: 'Current tag', to: 'New tag' },
      });
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(args.request, RenameSkillTagDocument, {
        input: parsed.data,
      });
      return { intent, ok: true };
    }

    if (intent === 'removeTag') {
      const parsed = parseFormData(formData, RemoveSkillTagInputSchema());
      if (!parsed.success) {
        return { error: parsed.error, intent };
      }
      await executeGraphqlWithAuth(args.request, RemoveSkillTagDocument, {
        input: parsed.data,
      });
      return { intent, ok: true };
    }

    return { error: `Unknown intent "${intent}".`, intent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message, intent };
  }
};
