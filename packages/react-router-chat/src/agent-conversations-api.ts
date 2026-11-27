import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import { mapPersistedAgentConversationMessages } from './mapPersistedAgentConversationMessages';
import type {
  AgentConversationListItem,
  ChatActiveTurn,
  ListAgentConversationsResult,
  LoadAgentConversationMessagesResult,
  MutateAgentConversationResult,
} from './types';

/**
 * @description Shared persisted-conversation CRUD for the agentic chat sidebar /
 * switcher — list, load-messages, rename, soft-delete, restore — behind the
 * `/resources/agent-conversations` resource route in both apps. Single-sourced
 * here (each app injects only its generated documents) so the developer and
 * admin copies cannot drift. This is the CRUD half of the old `utils.agents-chat`;
 * the non-streaming MCP-tool-router turn path (`agentsRunChatTurn` /
 * `send-agent-message`) is a distinct, deliberately-delimited surface that stays
 * in the developer app. Server-only: the intent handlers run in resource-route
 * actions / the root action, stripped from the client bundle.
 */

/** A persisted conversation row (GraphQL) reduced to the sidebar list-item shape. @public */
export interface AgentConversationRow {
  /** Absent when an app's document does not select it (the admin app); read as null. */
  readonly groupId?: string | null;
  readonly id: string;
  /** Absent when an app's document does not select it (the admin app); read as false. */
  readonly pinned?: boolean | null;
  readonly status: string;
  readonly title?: string | null;
  readonly updatedAt: unknown;
}

/** An image attached to a persisted message, as a GraphQL selection may type it. @public */
export interface PersistedAgentAttachmentRow {
  readonly byteSize: number;
  readonly height?: number | null;
  readonly id: string;
  readonly mimeType: string;
  readonly originalName?: string | null;
  readonly width?: number | null;
}

/** A persisted agent message row the loader maps into the chat thread. @public */
export interface PersistedAgentMessageRow {
  /** Absent when an app's document does not select it (the admin app). */
  readonly attachments?: readonly PersistedAgentAttachmentRow[];
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly role: string;
  readonly routingConfidence?: number | null;
  readonly routingReason?: string | null;
  readonly toolMetadataJson?: string | null;
}

/** @public */
export const emptyLoadAgentConversationMessagesResult = (
  overrides: Partial<LoadAgentConversationMessagesResult>,
): LoadAgentConversationMessagesResult => {
  return {
    activeTurn: null,
    conversationId: null,
    errorMessage: null,
    firstMessageIndex: 0,
    messages: [],
    ...overrides,
  };
};

/** @public */
export const emptyListAgentConversationsResult = (
  overrides: Partial<ListAgentConversationsResult>,
): ListAgentConversationsResult => {
  return {
    conversations: [],
    errorMessage: null,
    totalCount: 0,
    ...overrides,
  };
};

/** @public */
export const emptyMutateAgentConversationResult = (
  overrides: Partial<MutateAgentConversationResult>,
): MutateAgentConversationResult => {
  return {
    conversation: null,
    errorMessage: null,
    ...overrides,
  };
};

/**
 * Map a persisted conversation row (GraphQL) to the sidebar list-item shape.
 * @public
 */
export const toAgentConversationListItem = (
  row: AgentConversationRow,
): AgentConversationListItem => {
  return {
    groupId: row.groupId ?? null,
    id: row.id,
    pinned: row.pinned ?? false,
    status: row.status,
    title: row.title ?? null,
    updatedAt: String(row.updatedAt),
  };
};

/** Reduce a GraphQL active-turn row to its JSON-safe chat shape. */
const toChatActiveTurn = (
  row: {
    readonly assistantMessageId: string;
    readonly startedAt: unknown;
  } | null,
): ChatActiveTurn | null => {
  if (row === null) {
    return null;
  }

  return {
    assistantMessageId: row.assistantMessageId,
    startedAt: String(row.startedAt),
  };
};

/** Parse a non-empty trimmed string form field, or null. @public */
export const trimStringFormField = (
  value: FormDataEntryValue | null,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

/** Parse a finite integer form field, or undefined. */
const parseIntFormField = (
  value: FormDataEntryValue | null,
): number | undefined => {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Rows per load-messages page: a restore, and each Load earlier after it. */
const DEFAULT_MESSAGES_PAGE_SIZE = 100;

/** @public */
export interface LoadAgentConversationMessagesParams {
  /**
   * Load the page of rows just before this position (a previous result's
   * `firstMessageIndex`), or undefined for the newest page.
   */
  readonly before: number | undefined;
  readonly conversationId: string;
  readonly limit?: number;
}

interface MessagesPage {
  readonly fromNewest: boolean;
  readonly limit: number;
  readonly offset: number;
}

/**
 * @description The page a load reads: the newest `limit` rows, or the `limit`
 * rows ending just before `before`, counted from the oldest row so turns sent
 * since the restore never shift it. Null when nothing precedes `before`.
 */
const resolveMessagesPage = (
  before: number | undefined,
  limit: number,
): MessagesPage | null => {
  if (before === undefined) {
    return { fromNewest: true, limit, offset: 0 };
  }

  if (before <= 0) {
    return null;
  }

  const offset = Math.max(before - limit, 0);

  return { fromNewest: false, limit: before - offset, offset };
};

/**
 * The app-generated conversation-CRUD documents the shared API executes. Kept
 * structural so each app's generated documents are assignable.
 * @public
 */
export interface AgentConversationsDocuments {
  readonly deleteDocument: TypedDocumentNode<
    { deleteAgentConversation: AgentConversationRow },
    { input: { conversationId: string } }
  >;
  readonly getMessagesDocument: TypedDocumentNode<
    {
      getAgentConversationMessages: {
        // Optional because generated selection types make it so.
        readonly activeTurn?: {
          readonly assistantMessageId: string;
          readonly startedAt: unknown;
        } | null;
        items: readonly PersistedAgentMessageRow[];
        totalCount: number;
      };
    },
    {
      input: {
        conversationId: string;
        fromNewest: boolean;
        limit: number;
        offset: number;
      };
    }
  >;
  readonly listDocument: TypedDocumentNode<
    {
      listAgentConversations: {
        items: readonly AgentConversationRow[];
        totalCount: number;
      };
    },
    { input: { limit?: number; offset?: number; status?: string } }
  >;
  readonly restoreDocument: TypedDocumentNode<
    { restoreAgentConversation: AgentConversationRow },
    { input: { conversationId: string } }
  >;
  readonly updateTitleDocument: TypedDocumentNode<
    { updateAgentConversationTitle: AgentConversationRow },
    { input: { conversationId: string; title: string } }
  >;
}

/** The persisted-conversation CRUD callers + root/resource intent handlers. @public */
export interface AgentConversationsApi {
  callDeleteAgentConversation(
    request: Request,
    params: { conversationId: string },
  ): Promise<MutateAgentConversationResult>;
  callListAgentConversations(
    request: Request,
    params?: { limit?: number; offset?: number; status?: string },
  ): Promise<ListAgentConversationsResult>;
  callLoadAgentConversationMessages(
    request: Request,
    params: LoadAgentConversationMessagesParams,
  ): Promise<LoadAgentConversationMessagesResult>;
  callRenameAgentConversation(
    request: Request,
    params: { conversationId: string; title: string },
  ): Promise<MutateAgentConversationResult>;
  callRestoreAgentConversation(
    request: Request,
    params: { conversationId: string },
  ): Promise<MutateAgentConversationResult>;
  handleDeleteAgentConversationIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult>;
  handleListAgentConversationsIntent(
    request: Request,
    formData: FormData,
  ): Promise<ListAgentConversationsResult>;
  handleLoadAgentConversationMessagesIntent(
    request: Request,
    formData: FormData,
  ): Promise<LoadAgentConversationMessagesResult>;
  handleRenameAgentConversationIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult>;
  handleRestoreAgentConversationIntent(
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult>;
}

/**
 * Build the persisted-conversation CRUD API from an app's generated documents.
 * @public
 */
export function createAgentConversationsApi(
  documents: AgentConversationsDocuments,
): AgentConversationsApi {
  const callLoadAgentConversationMessages = async (
    request: Request,
    params: LoadAgentConversationMessagesParams,
  ): Promise<LoadAgentConversationMessagesResult> => {
    const limit = params.limit ?? DEFAULT_MESSAGES_PAGE_SIZE;
    const page = resolveMessagesPage(params.before, limit);

    if (page === null) {
      return emptyLoadAgentConversationMessagesResult({
        conversationId: params.conversationId,
      });
    }

    const data = await executeGraphqlWithAuth(
      request,
      documents.getMessagesDocument,
      { input: { conversationId: params.conversationId, ...page } },
    );

    const { items, totalCount } = data.getAgentConversationMessages;
    // A newest page starts `items.length` rows before the end; an earlier page
    // starts at its own offset from the oldest row.
    const firstMessageIndex = page.fromNewest
      ? Math.max(totalCount - items.length, 0)
      : page.offset;

    const messages = mapPersistedAgentConversationMessages(
      items.map((message) => ({
        attachments: (message.attachments ?? []).map((attachment) => ({
          byteSize: attachment.byteSize,
          height: attachment.height ?? null,
          id: attachment.id,
          mimeType: attachment.mimeType,
          originalName: attachment.originalName ?? null,
          width: attachment.width ?? null,
        })),
        content: message.content,
        createdAt: message.createdAt,
        id: message.id,
        role: message.role,
        routingConfidence: message.routingConfidence ?? null,
        routingReason: message.routingReason ?? null,
        toolMetadataJson: message.toolMetadataJson ?? null,
      })),
    );

    const activeTurn = data.getAgentConversationMessages.activeTurn ?? null;

    return emptyLoadAgentConversationMessagesResult({
      activeTurn: toChatActiveTurn(activeTurn),
      conversationId: params.conversationId,
      firstMessageIndex,
      messages,
    });
  };

  const callListAgentConversations = async (
    request: Request,
    params: { limit?: number; offset?: number; status?: string } = {},
  ): Promise<ListAgentConversationsResult> => {
    const data = await executeGraphqlWithAuth(request, documents.listDocument, {
      input: {
        limit: params.limit ?? undefined,
        offset: params.offset ?? undefined,
        status: params.status ?? undefined,
      },
    });

    const list = data.listAgentConversations;

    return emptyListAgentConversationsResult({
      conversations: list.items.map(toAgentConversationListItem),
      totalCount: list.totalCount,
    });
  };

  const callRenameAgentConversation = async (
    request: Request,
    params: { conversationId: string; title: string },
  ): Promise<MutateAgentConversationResult> => {
    const data = await executeGraphqlWithAuth(
      request,
      documents.updateTitleDocument,
      { input: { conversationId: params.conversationId, title: params.title } },
    );

    return emptyMutateAgentConversationResult({
      conversation: toAgentConversationListItem(
        data.updateAgentConversationTitle,
      ),
    });
  };

  const callDeleteAgentConversation = async (
    request: Request,
    params: { conversationId: string },
  ): Promise<MutateAgentConversationResult> => {
    const data = await executeGraphqlWithAuth(
      request,
      documents.deleteDocument,
      { input: { conversationId: params.conversationId } },
    );

    return emptyMutateAgentConversationResult({
      conversation: toAgentConversationListItem(data.deleteAgentConversation),
    });
  };

  const callRestoreAgentConversation = async (
    request: Request,
    params: { conversationId: string },
  ): Promise<MutateAgentConversationResult> => {
    const data = await executeGraphqlWithAuth(
      request,
      documents.restoreDocument,
      { input: { conversationId: params.conversationId } },
    );

    return emptyMutateAgentConversationResult({
      conversation: toAgentConversationListItem(data.restoreAgentConversation),
    });
  };

  const handleLoadAgentConversationMessagesIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<LoadAgentConversationMessagesResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));

    if (conversationId == null) {
      return emptyLoadAgentConversationMessagesResult({
        errorMessage: 'conversationId is required',
      });
    }

    try {
      return await callLoadAgentConversationMessages(request, {
        before: parseIntFormField(formData.get('before')),
        conversationId,
        limit: DEFAULT_MESSAGES_PAGE_SIZE,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load conversation';

      return emptyLoadAgentConversationMessagesResult({
        conversationId,
        errorMessage,
      });
    }
  };

  const handleListAgentConversationsIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<ListAgentConversationsResult> => {
    const status = trimStringFormField(formData.get('status')) ?? undefined;
    const limit = parseIntFormField(formData.get('limit'));
    const offset = parseIntFormField(formData.get('offset'));

    try {
      return await callListAgentConversations(request, {
        limit,
        offset,
        status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to list conversations';

      return emptyListAgentConversationsResult({ errorMessage });
    }
  };

  const handleRenameAgentConversationIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));
    const title = trimStringFormField(formData.get('title'));

    if (conversationId == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'conversationId is required',
      });
    }

    if (title == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'title is required',
      });
    }

    try {
      return await callRenameAgentConversation(request, {
        conversationId,
        title,
      });
    } catch (error) {
      const fallback = 'Failed to rename conversation';
      const errorMessage = error instanceof Error ? error.message : fallback;

      return emptyMutateAgentConversationResult({ errorMessage });
    }
  };

  const handleDeleteAgentConversationIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));

    if (conversationId == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'conversationId is required',
      });
    }

    try {
      return await callDeleteAgentConversation(request, { conversationId });
    } catch (error) {
      const fallback = 'Failed to delete conversation';
      const errorMessage = error instanceof Error ? error.message : fallback;

      return emptyMutateAgentConversationResult({ errorMessage });
    }
  };

  const handleRestoreAgentConversationIntent = async (
    request: Request,
    formData: FormData,
  ): Promise<MutateAgentConversationResult> => {
    const conversationId = trimStringFormField(formData.get('conversationId'));

    if (conversationId == null) {
      return emptyMutateAgentConversationResult({
        errorMessage: 'conversationId is required',
      });
    }

    try {
      return await callRestoreAgentConversation(request, { conversationId });
    } catch (error) {
      const fallback = 'Failed to restore conversation';
      const errorMessage = error instanceof Error ? error.message : fallback;

      return emptyMutateAgentConversationResult({ errorMessage });
    }
  };

  return {
    callDeleteAgentConversation,
    callListAgentConversations,
    callLoadAgentConversationMessages,
    callRenameAgentConversation,
    callRestoreAgentConversation,
    handleDeleteAgentConversationIntent,
    handleListAgentConversationsIntent,
    handleLoadAgentConversationMessagesIntent,
    handleRenameAgentConversationIntent,
    handleRestoreAgentConversationIntent,
  };
}
