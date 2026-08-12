import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';
import { parseFileMentionsField } from '~/routing/home/utils/parse-file-mentions-field';
import type { Route } from '@/app/routes/+types/resources.conversation-stream';

/** JSON shape returned by the `start` intent (mirrors StartConversationStreamResult). */
export interface StartActionResult {
  readonly assistantMessageId: string | null;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly userMessageId: string | null;
}

/**
 * Resource route action backing the agentic chat's streaming turn —
 * `POST /resources/conversation-stream`. Route-independent so BOTH the home
 * route and the globally-mounted header `ChatDialog` post here (rather than a
 * per-route `/` action). `intent=cancel` cancels the in-flight stream;
 * otherwise it starts a turn via StartConversationStream. reasoning /
 * serviceTier / permissionMode / fileMentions are forwarded but not yet honored
 * server-side (plan cacb864e).
 */
export const action = async (
  args: Route.ActionArgs,
): Promise<StartActionResult | { cancelled: boolean }> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'cancel') {
    const conversationId = String(formData.get('conversationId') ?? '');
    if (conversationId) {
      await executeGraphqlWithAuth(
        args.request,
        CancelConversationStreamDocument,
        { conversationId },
      );
    }

    return { cancelled: true };
  }

  const conversationId = String(formData.get('conversationId') ?? '');
  // Private mode is opt-in: the form only sends `persist=false` to run an
  // ephemeral turn. Absent → null → the server default (persist=true).
  const persist = formData.get('persist') === 'false' ? false : null;
  const input = {
    backend: String(formData.get('backend') ?? '') || null,
    baseUrl: String(formData.get('baseUrl') ?? '') || null,
    conversationId: conversationId || null,
    fileMentions: parseFileMentionsField(formData.get('fileMentions')),
    message: String(formData.get('message') ?? ''),
    modelId: String(formData.get('modelId') ?? '') || null,
    permissionMode: String(formData.get('permissionMode') ?? '') || null,
    persist,
    personaId: String(formData.get('personaId') ?? '') || null,
    reasoning: String(formData.get('reasoning') ?? '') || null,
    repositoryId: String(formData.get('repositoryId') ?? '') || null,
    serviceTier: String(formData.get('serviceTier') ?? '') || null,
  };

  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      StartConversationStreamDocument,
      { input },
    );

    const result = data.startConversationStream;

    return {
      assistantMessageId: result.assistantMessageId ?? null,
      conversationId: result.conversationId ?? null,
      errorMessage: result.errorMessage ?? null,
      userMessageId: result.userMessageId ?? null,
    };
  } catch (error) {
    const isError = error instanceof Error;

    return {
      assistantMessageId: null,
      conversationId: null,
      errorMessage: isError ? error.message : 'Failed to start stream.',
      userMessageId: null,
    };
  }
};
