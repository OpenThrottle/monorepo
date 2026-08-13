import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mapPersistedAgentConversationMessages } from './map-persisted-messages';
import type {
  AgentConversationListItem,
  ListAgentConversationsResult,
  LoadAgentConversationMessagesResult,
  MutateAgentConversationResult,
} from './types';

/**
 * @description Shared persisted-conversation CRUD for the agentic chat sidebar /
 * switcher — list, load-messages, rename, soft-delete — behind the
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
  readonly id: string;
  readonly status: string;
  readonly title?: string | null;
  readonly updatedAt: unknown;
}

/** A persisted agent message row the loader maps into the chat thread. @public */
export interface PersistedAgentMessageRow {
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
): LoadAgentConversationMessagesResult => ({
  conversationId: null,
  errorMessage: null,
  messages: [],
  ...overrides,
});

/** @public */
export const emptyListAgentConversationsResult = (
  overrides: Partial<ListAgentConversationsResult>,
): ListAgentConversationsResult => ({
  conversations: [],
  errorMessage: null,
  totalCount: 0,
  ...overrides,
});

/** @public */
export const emptyMutateAgentConversationResult = (
  overrides: Partial<MutateAgentConversationResult>,
): MutateAgentConversationResult => ({
  conversation: null,
  errorMessage: null,
  ...overrides,
});

/** Map a persisted conversation row (GraphQL) to the sidebar list-item shape. */
const toAgentConversationListItem = (
  row: AgentConversationRow,
): AgentConversationListItem => ({
  id: row.id,
  status: row.status,
  title: row.title ?? null,
  updatedAt: String(row.updatedAt),
});

/** Parse a non-empty trimmed string form field, or null. */
const trimStringFormField = (
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
        messages: readonly PersistedAgentMessageRow[];
      };
    },
    { input: { conversationId: string; limit: number } }
  >;
  readonly listDocument: TypedDocumentNode<
    {
      listAgentConversations: {
        conversations: readonly AgentConversationRow[];
        totalCount: number;
      };
    },
    { input: { limit?: number; offset?: number; status?: string } }
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
    params: { conversationId: string; limit?: number },
  ): Promise<LoadAgentConversationMessagesResult>;
  callRenameAgentConversation(
    request: Request,
    params: { conversationId: string; title: string },
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
    params: { conversationId: string; limit?: number },
  ): Promise<LoadAgentConversationMessagesResult> => {
    const data = await executeGraphqlWithAuth(
      request,
      documents.getMessagesDocument,
      {
        input: {
          conversationId: params.conversationId,
          limit: params.limit ?? 100,
        },
      },
    );

    const messages = mapPersistedAgentConversationMessages(
      data.getAgentConversationMessages.messages.map((message) => ({
        content: message.content,
        createdAt: message.createdAt,
        id: message.id,
        role: message.role,
        routingConfidence: message.routingConfidence ?? null,
        routingReason: message.routingReason ?? null,
        toolMetadataJson: message.toolMetadataJson ?? null,
      })),
    );

    return emptyLoadAgentConversationMessagesResult({
      conversationId: params.conversationId,
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
      conversations: list.conversations.map(toAgentConversationListItem),
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
        conversationId,
        limit: 100,
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to rename conversation';

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
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to delete conversation';

      return emptyMutateAgentConversationResult({ errorMessage });
    }
  };

  return {
    callDeleteAgentConversation,
    callListAgentConversations,
    callLoadAgentConversationMessages,
    callRenameAgentConversation,
    handleDeleteAgentConversationIntent,
    handleListAgentConversationsIntent,
    handleLoadAgentConversationMessagesIntent,
    handleRenameAgentConversationIntent,
  };
}
