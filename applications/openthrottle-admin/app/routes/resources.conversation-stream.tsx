import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.conversation-stream';

/** JSON shape returned by the `start` intent (mirrors StartConversationStreamResult). */
export interface StartActionResult {
  readonly assistantMessageId: string | null;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly userMessageId: string | null;
}

/**
 * Decode the JSON-encoded `fileMentions` form field into a string array, or null
 * when absent or malformed. Defensive: the value is our own JSON.stringify
 * output, but a bad value must never 500 the turn.
 */
const parseFileMentionsField = (
  value: FormDataEntryValue | null,
): string[] | null => {
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const paths = parsed.filter(
      (entry): entry is string => typeof entry === 'string',
    );
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
};

/**
 * Resource route action backing the admin header chat's streaming turn —
 * `POST /resources/conversation-stream`. Mirrors the developer route:
 * `intent=cancel` cancels the in-flight stream; otherwise it starts a turn via
 * StartConversationStream. reasoning / serviceTier / permissionMode /
 * fileMentions are forwarded but not yet honored server-side (plan cacb864e).
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
  // Private mode is opt-in: the form only sends `persist=false`. Absent → null →
  // the server default (persist=true).
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
