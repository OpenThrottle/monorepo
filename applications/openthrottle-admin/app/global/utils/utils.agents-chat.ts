import type {
  AgentConversationListItem,
  ListAgentConversationsResult,
  LoadAgentConversationMessagesResult,
  MutateAgentConversationResult,
} from '@openthrottle/react-router-chat';
import { mapPersistedAgentConversationMessages } from '@openthrottle/react-router-chat';
import {
  DeleteAgentConversationDocument,
  GetAgentConversationMessagesDocument,
  ListAgentConversationsDocument,
  UpdateAgentConversationTitleDocument,
} from '~/__generated__/graphql';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

export interface CallLoadAgentConversationMessagesParams {
  readonly conversationId: string;
  readonly limit?: number;
}

export interface CallListAgentConversationsParams {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: string;
}

export interface CallRenameAgentConversationParams {
  readonly conversationId: string;
  readonly title: string;
}

export interface CallDeleteAgentConversationParams {
  readonly conversationId: string;
}

export const emptyLoadAgentConversationMessagesResult = (
  overrides: Partial<LoadAgentConversationMessagesResult>,
): LoadAgentConversationMessagesResult => ({
  conversationId: null,
  errorMessage: null,
  messages: [],
  ...overrides,
});

export const emptyListAgentConversationsResult = (
  overrides: Partial<ListAgentConversationsResult>,
): ListAgentConversationsResult => ({
  conversations: [],
  errorMessage: null,
  totalCount: 0,
  ...overrides,
});

export const emptyMutateAgentConversationResult = (
  overrides: Partial<MutateAgentConversationResult>,
): MutateAgentConversationResult => ({
  conversation: null,
  errorMessage: null,
  ...overrides,
});

/** Map a persisted conversation row (GraphQL) to the sidebar list-item shape. */
const toAgentConversationListItem = (row: {
  id: string;
  status: string;
  title?: string | null;
  updatedAt: unknown;
}): AgentConversationListItem => ({
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
 * @description Resource action handler for `intent: load-messages` — restore a thread.
 */
export async function handleLoadAgentConversationMessagesIntent(
  request: Request,
  formData: FormData,
): Promise<LoadAgentConversationMessagesResult> {
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
}

/**
 * @description Resource action handler for `intent: list` — paginated conversation list.
 */
export async function handleListAgentConversationsIntent(
  request: Request,
  formData: FormData,
): Promise<ListAgentConversationsResult> {
  const status = trimStringFormField(formData.get('status')) ?? undefined;
  const limit = parseIntFormField(formData.get('limit'));
  const offset = parseIntFormField(formData.get('offset'));

  try {
    return await callListAgentConversations(request, { limit, offset, status });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to list conversations';

    return emptyListAgentConversationsResult({ errorMessage });
  }
}

/**
 * @description Resource action handler for `intent: rename`.
 */
export async function handleRenameAgentConversationIntent(
  request: Request,
  formData: FormData,
): Promise<MutateAgentConversationResult> {
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
      error instanceof Error ? error.message : 'Failed to rename conversation';

    return emptyMutateAgentConversationResult({ errorMessage });
  }
}

/**
 * @description Resource action handler for `intent: delete` (soft-delete).
 */
export async function handleDeleteAgentConversationIntent(
  request: Request,
  formData: FormData,
): Promise<MutateAgentConversationResult> {
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
      error instanceof Error ? error.message : 'Failed to delete conversation';

    return emptyMutateAgentConversationResult({ errorMessage });
  }
}

/**
 * @description Load persisted agent conversation messages for the authenticated user.
 */
export async function callLoadAgentConversationMessages(
  request: Request,
  params: CallLoadAgentConversationMessagesParams,
): Promise<LoadAgentConversationMessagesResult> {
  const data = await executeGraphqlWithAuth(
    request,
    GetAgentConversationMessagesDocument,
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
}

/**
 * @description List persisted conversations for the authenticated user (paginated).
 */
export async function callListAgentConversations(
  request: Request,
  params: CallListAgentConversationsParams = {},
): Promise<ListAgentConversationsResult> {
  const data = await executeGraphqlWithAuth(
    request,
    ListAgentConversationsDocument,
    {
      input: {
        limit: params.limit ?? undefined,
        offset: params.offset ?? undefined,
        status: params.status ?? undefined,
      },
    },
  );

  const list = data.listAgentConversations;

  return emptyListAgentConversationsResult({
    conversations: list.conversations.map(toAgentConversationListItem),
    totalCount: list.totalCount,
  });
}

/**
 * @description Rename an owned conversation (reuses updateAgentConversationTitle).
 */
export async function callRenameAgentConversation(
  request: Request,
  params: CallRenameAgentConversationParams,
): Promise<MutateAgentConversationResult> {
  const data = await executeGraphqlWithAuth(
    request,
    UpdateAgentConversationTitleDocument,
    {
      input: {
        conversationId: params.conversationId,
        title: params.title,
      },
    },
  );

  return emptyMutateAgentConversationResult({
    conversation: toAgentConversationListItem(
      data.updateAgentConversationTitle,
    ),
  });
}

/**
 * @description Soft-delete an owned conversation (status=deleted; row retained).
 */
export async function callDeleteAgentConversation(
  request: Request,
  params: CallDeleteAgentConversationParams,
): Promise<MutateAgentConversationResult> {
  const data = await executeGraphqlWithAuth(
    request,
    DeleteAgentConversationDocument,
    {
      input: { conversationId: params.conversationId },
    },
  );

  return emptyMutateAgentConversationResult({
    conversation: toAgentConversationListItem(data.deleteAgentConversation),
  });
}
