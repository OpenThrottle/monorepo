import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { ChatStartActionResult } from './hooks/use-agentic-chat-turn';

/**
 * @description Shared `/resources/conversation-stream` resource-route action —
 * the streaming-turn start/cancel endpoint both the home route and the
 * globally-mounted header `ChatDialog` post to. Single-sourced here so the
 * developer and admin routes cannot drift; each app supplies only its generated
 * Start/Cancel documents (the operations are app-generated, everything else is
 * shared). Server-only: imported solely by the route module, whose action is
 * stripped from the client bundle.
 */

/**
 * Decode the JSON-encoded `fileMentions` form field (workspace-relative paths
 * parsed from the composer draft) into a string array, or null when absent or
 * malformed. Defensive: the value is our own JSON.stringify output, but a bad
 * value must never 500 the turn.
 * @public
 */
export const parseFileMentionsField = (
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
 * Structural `StartConversationStreamInput` — the mutation variables' `input`
 * the action builds from the posted form. Each app's generated input type is
 * assignable to this (all fields but `message` are nullable + additive).
 * @public
 */
export interface ConversationStreamStartInput {
  readonly backend: string | null;
  readonly baseUrl: string | null;
  readonly conversationId: string | null;
  readonly fileMentions: string[] | null;
  readonly message: string;
  readonly modelId: string | null;
  readonly permissionMode: string | null;
  readonly persist: boolean | null;
  readonly personaId: string | null;
  readonly reasoning: string | null;
  readonly repositoryId: string | null;
  readonly serviceTier: string | null;
}

/**
 * Map a posted conversation-stream form into the `StartConversationStream`
 * mutation input. Private mode is opt-in: the form only sends `persist=false` to
 * run an ephemeral turn; absent → null → the server default (persist=true).
 * @public
 */
export function buildStartConversationStreamInput(
  formData: FormData,
): ConversationStreamStartInput {
  const conversationId = String(formData.get('conversationId') ?? '');

  return {
    backend: String(formData.get('backend') ?? '') || null,
    baseUrl: String(formData.get('baseUrl') ?? '') || null,
    conversationId: conversationId || null,
    fileMentions: parseFileMentionsField(formData.get('fileMentions')),
    message: String(formData.get('message') ?? ''),
    modelId: String(formData.get('modelId') ?? '') || null,
    permissionMode: String(formData.get('permissionMode') ?? '') || null,
    persist: formData.get('persist') === 'false' ? false : null,
    personaId: String(formData.get('personaId') ?? '') || null,
    reasoning: String(formData.get('reasoning') ?? '') || null,
    repositoryId: String(formData.get('repositoryId') ?? '') || null,
    serviceTier: String(formData.get('serviceTier') ?? '') || null,
  };
}

/** Structural `StartConversationStreamResult` the action reads. */
interface StartConversationStreamPayload {
  readonly startConversationStream: {
    readonly assistantMessageId?: string | null;
    readonly conversationId?: string | null;
    readonly errorMessage?: string | null;
    readonly userMessageId?: string | null;
  };
}

/**
 * The app-generated Start/Cancel `ConversationStream` documents the shared
 * action executes. Kept structural so each app's generated documents are
 * assignable.
 * @public
 */
export interface ConversationStreamActionDocuments {
  readonly cancelDocument: TypedDocumentNode<
    unknown,
    { conversationId: string }
  >;
  readonly startDocument: TypedDocumentNode<
    StartConversationStreamPayload,
    { input: ConversationStreamStartInput }
  >;
}

/**
 * Build the `/resources/conversation-stream` action. `intent=cancel` cancels the
 * in-flight stream; otherwise it starts a turn via StartConversationStream
 * (reasoning / serviceTier / permissionMode / fileMentions are forwarded).
 * @public
 */
export function createConversationStreamAction(
  documents: ConversationStreamActionDocuments,
): (args: {
  request: Request;
}) => Promise<ChatStartActionResult | { cancelled: boolean }> {
  return async (args) => {
    const formData = await args.request.formData();
    const intent = formData.get('intent');

    if (intent === 'cancel') {
      const conversationId = String(formData.get('conversationId') ?? '');
      if (conversationId) {
        await executeGraphqlWithAuth(args.request, documents.cancelDocument, {
          conversationId,
        });
      }

      return { cancelled: true };
    }

    const input = buildStartConversationStreamInput(formData);

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        documents.startDocument,
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
}
