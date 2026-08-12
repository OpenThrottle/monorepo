import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  DeletePromptDocument,
  UpdatePromptDocument,
  WritePromptToFileSystemDocument,
  type UpdateCustomPromptInput,
} from '~/__generated__/graphql';
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
    const content = formData.get('content');

    if (typeof content !== 'string') {
      return { error: 'Content is required.' };
    }

    try {
      const input: UpdateCustomPromptInput = {
        content,
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
