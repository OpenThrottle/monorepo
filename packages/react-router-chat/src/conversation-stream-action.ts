import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { isRecord } from '@openthrottle/nodejs-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import { CHAT_ATTACHMENT_TURN_ERROR_COPY } from './data/copy';
import type { ChatStartActionResult } from './types';
import { parseJson } from './utils/json';

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
 * Decode a JSON-encoded string-array form field (`fileMentions`,
 * `repositoryIds`) into a string array, or null when absent, empty or
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
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) {
    return null;
  }
  const paths = parsed.filter(
    (entry): entry is string => typeof entry === 'string',
  );
  return paths.length > 0 ? paths : null;
};

/**
 * Structural `StartConversationStreamInput` — the mutation variables' `input`
 * the action builds from the posted form. Each app's generated input type is
 * assignable to this (all fields but `message` are nullable + additive).
 * @public
 */
export interface ConversationStreamStartInput {
  /** Uploaded image attachment ids to send with the turn (max 8). */
  readonly attachmentIds: string[] | null;
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
  /**
   * Selected checkouts, primary first — index 0 becomes the process `cwd`, the
   * rest additional granted directories. Supersedes {@link repositoryId}.
   */
  readonly repositoryIds: string[] | null;
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
    attachmentIds: parseFileMentionsField(formData.get('attachmentIds')),
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
    // Retained for any in-flight client still posting the single field; the
    // resolver treats it as a one-element list.
    repositoryId: String(formData.get('repositoryId') ?? '') || null,
    repositoryIds: parseFileMentionsField(formData.get('repositoryIds')),
    serviceTier: String(formData.get('serviceTier') ?? '') || null,
  };
}

/** Whether a GraphQL `extensions.reason` has attachment-specific copy. */
const isAttachmentReason = (
  value: unknown,
): value is keyof typeof CHAT_ATTACHMENT_TURN_ERROR_COPY => {
  return (
    typeof value === 'string' &&
    Object.hasOwn(CHAT_ATTACHMENT_TURN_ERROR_COPY, value)
  );
};

/**
 * The message a failed start shows. A rejected attachment turn carries a
 * machine-readable `extensions.reason` the user gets plain-language copy for;
 * anything else keeps the error's own message.
 */
const toStartErrorMessage = (error: unknown): string => {
  // A GraphqlResponseError carries the server's `extensions`; read it
  // structurally so this stays independent of the graphql client's module.
  const extensions = error instanceof Error && 'extensions' in error ? error.extensions : null; // prettier-ignore
  const reason = isRecord(extensions) ? extensions.reason : undefined;
  if (isAttachmentReason(reason)) {
    return CHAT_ATTACHMENT_TURN_ERROR_COPY[reason];
  }

  return error instanceof Error ? error.message : 'Failed to start stream.';
};

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
  readonly respondPermissionDocument: TypedDocumentNode<
    unknown,
    { conversationId: string; optionId: string | null; requestId: string }
  >;
  readonly startDocument: TypedDocumentNode<
    StartConversationStreamPayload,
    { input: ConversationStreamStartInput }
  >;
}

/**
 * Build the `/resources/conversation-stream` action. `intent=cancel` cancels the
 * in-flight stream; `intent=respond-permission` answers a pending permission
 * request; otherwise it starts a turn via StartConversationStream
 * (reasoning / serviceTier / permissionMode / fileMentions are forwarded).
 * @public
 */
export function createConversationStreamAction(
  documents: ConversationStreamActionDocuments,
): (args: {
  request: Request;
}) => Promise<
  ChatStartActionResult | { cancelled: boolean } | { responded: boolean }
> {
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

    if (intent === 'respond-permission') {
      const conversationId = String(formData.get('conversationId') ?? '');
      const requestId = String(formData.get('requestId') ?? '');
      // An empty option id is the form encoding of "cancel".
      const optionId = String(formData.get('optionId') ?? '') || null;
      if (!conversationId || !requestId) {
        return { responded: false };
      }

      await executeGraphqlWithAuth(
        args.request,
        documents.respondPermissionDocument,
        { conversationId, optionId, requestId },
      );

      return { responded: true };
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
      return {
        assistantMessageId: null,
        conversationId: null,
        errorMessage: toStartErrorMessage(error),
        userMessageId: null,
      };
    }
  };
}
