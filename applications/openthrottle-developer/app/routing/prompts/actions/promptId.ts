import { redirect } from 'react-router';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  DeletePromptDocument,
  UpdatePromptDocument,
  WritePromptToFileSystemDocument,
} from '~/__generated__/graphql';
import { UpdateCustomPromptInputSchema } from '~/__generated__/schemas';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import type { Route } from '@/app/routes/+types/prompts.$promptId';

/**
 * @description Prompt detail mutations (delete, write-to-filesystem, update),
 * dispatched by `intent`. Extracted from the route action per
 * route-primitive-shape R4 so the route file stays a thin adapter.
 */
export const runPromptDetailAction = async (args: Route.ActionArgs) => {
  const promptId = args.params.promptId;

  if (!promptId) {
    return { error: 'Missing prompt id.' };
  }

  const decodedId = decodeURIComponent(promptId);
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    try {
      await executeGraphqlWithAuth(args.request, DeletePromptDocument, {
        id: decodedId,
      });

      return redirect(PROMPTS_BASE_PATH);
    } catch {
      return { error: 'Failed to delete prompt.' };
    }
  }

  if (intent === 'writeToFileSystem') {
    try {
      await executeGraphqlWithAuth(
        args.request,
        WritePromptToFileSystemDocument,
        { id: decodedId },
      );

      return { success: true };
    } catch {
      return { error: 'Failed to write to file system.' };
    }
  }

  if (intent === 'update') {
    // `id` is the route param; the editor only posts `content`.
    const parsed = parseFormData(
      formData,
      UpdateCustomPromptInputSchema().omit({
        id: true,
        writeToFileSystem: true,
      }),
    );
    if (!parsed.success) {
      return { error: parsed.error };
    }

    try {
      const input = {
        ...parsed.data,
        id: decodedId,
      };

      const result = await executeGraphqlWithAuth(
        args.request,
        UpdatePromptDocument,
        { input },
      );

      if (!result.updateCustomPrompt) {
        return { error: 'Prompt not found.' };
      }

      return { success: true };
    } catch {
      return { error: 'Failed to update prompt.' };
    }
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};
