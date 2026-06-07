/**
 * @description Read-only MCP tools for persisted web chat threads:
 * agent_conversation_list, agent_conversation_get, agent_conversation_get_messages.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import {
  type GetAgentConversationMessagesQuery,
  type GetAgentConversationQuery,
  type ListAgentConversationsQuery,
  GetAgentConversationDocument,
  GetAgentConversationMessagesDocument,
  ListAgentConversationsDocument,
} from '../__generated__/graphql.js';
import {
  GetAgentConversationMessagesInputSchema,
  ListAgentConversationsInputSchema,
} from '../__generated__/schemas.js';
import type { GenericResult } from '../types/index.js';
import { getAuthToken } from '../auth/get-auth-token.js';
import { invalidArgsContent } from '../utils/errors.js';
import { runTool } from '../utils/tool-result.js';

const LIST_DEFAULT_LIMIT = 20;
const LIST_MAX_LIMIT = 100;
const MESSAGES_DEFAULT_LIMIT = 100;
const MESSAGES_MAX_LIMIT = 500;

const AGENT_CONVERSATION_BOUNDARY_WARNING =
  'Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.';

type ListAgentConversationsResult = GenericResult<{
  conversations: ListAgentConversationsQuery['listAgentConversations']['conversations'];
  totalCount: number;
}>;

type GetAgentConversationResult = GenericResult<{
  conversation: GetAgentConversationQuery['getAgentConversation'];
}>;

type GetAgentConversationMessagesResult = GenericResult<{
  messages: GetAgentConversationMessagesQuery['getAgentConversationMessages']['messages'];
  totalCount: number;
}>;

export const listAgentConversationsToolParameters =
  ListAgentConversationsInputSchema();

export const getAgentConversationToolParameters = z.object({
  id: z.string().min(1),
});

export const getAgentConversationMessagesToolParameters =
  GetAgentConversationMessagesInputSchema();

export const listAgentConversationsToolDescription = `List persisted web chat conversations for the authenticated human user. Optional status filter (default \`active\`), limit, and offset. ${AGENT_CONVERSATION_BOUNDARY_WARNING}`;

export const getAgentConversationToolDescription = `Fetch one persisted web chat conversation by id for the authenticated human user. Returns null when not found or not owned. ${AGENT_CONVERSATION_BOUNDARY_WARNING}`;

export const getAgentConversationMessagesToolDescription = `List messages for an owned web chat conversation ordered by sort_order ascending. Optional limit and offset. ${AGENT_CONVERSATION_BOUNDARY_WARNING}`;

/**
 * @description Resolves list pagination with grill-me defaults (20 default, 100 max).
 */
const resolveListLimit = (limit: number | null | undefined): number =>
  Math.min(limit ?? LIST_DEFAULT_LIMIT, LIST_MAX_LIMIT);

/**
 * @description Resolves message pagination with grill-me defaults (100 default, 500 max).
 */
const resolveMessagesLimit = (limit: number | null | undefined): number =>
  Math.min(limit ?? MESSAGES_DEFAULT_LIMIT, MESSAGES_MAX_LIMIT);

export async function listAgentConversationsToolHandler(
  args: z.infer<typeof listAgentConversationsToolParameters>,
): Promise<ListAgentConversationsResult> {
  const parsed = listAgentConversationsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const limit = resolveListLimit(parsed.data.limit);
  const offset = parsed.data.offset ?? 0;
  const status = parsed.data.status ?? 'active';

  return runTool<{
    conversations: ListAgentConversationsQuery['listAgentConversations']['conversations'];
    totalCount: number;
  }>('agent_conversation_list', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      ListAgentConversationsDocument,
      {
        input: { limit, offset, status },
      },
    );

    const listResult = result?.listAgentConversations;
    if (!listResult) return null;

    const { conversations, totalCount } = listResult;
    const text =
      conversations.length === 0
        ? `No conversations found (totalCount: ${totalCount}).`
        : `Conversations (${conversations.length} of ${totalCount}):\n${JSON.stringify(conversations, null, 2)}`;

    return { structuredContent: { conversations, totalCount }, text };
  });
}

export async function getAgentConversationToolHandler(
  args: z.infer<typeof getAgentConversationToolParameters>,
): Promise<GetAgentConversationResult> {
  const parsed = getAgentConversationToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{
    conversation: GetAgentConversationQuery['getAgentConversation'];
  }>('agent_conversation_get', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      GetAgentConversationDocument,
      { id: parsed.data.id },
    );

    const conversation = result?.getAgentConversation ?? null;
    const text =
      conversation === null
        ? `Conversation not found or not owned: ${parsed.data.id}`
        : `Conversation: ${conversation.id}\n${JSON.stringify(conversation, null, 2)}`;

    return { structuredContent: { conversation }, text };
  });
}

export async function getAgentConversationMessagesToolHandler(
  args: z.infer<typeof getAgentConversationMessagesToolParameters>,
): Promise<GetAgentConversationMessagesResult> {
  const parsed = getAgentConversationMessagesToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  const limit = resolveMessagesLimit(parsed.data.limit);
  const offset = parsed.data.offset ?? 0;

  return runTool<{
    messages: GetAgentConversationMessagesQuery['getAgentConversationMessages']['messages'];
    totalCount: number;
  }>('agent_conversation_get_messages', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      GetAgentConversationMessagesDocument,
      {
        input: {
          conversationId: parsed.data.conversationId,
          limit,
          offset,
        },
      },
    );

    const messagesResult = result?.getAgentConversationMessages;
    if (!messagesResult) return null;

    const { messages, totalCount } = messagesResult;
    const text =
      messages.length === 0
        ? `No messages found for conversation ${parsed.data.conversationId} (totalCount: ${totalCount}).`
        : `Messages (${messages.length} of ${totalCount}):\n${JSON.stringify(messages, null, 2)}`;

    return { structuredContent: { messages, totalCount }, text };
  });
}

export function registerAgentConversationTools(server: McpServer): void {
  server.registerTool(
    'agent_conversation_get',
    {
      description: getAgentConversationToolDescription,
      inputSchema: getAgentConversationToolParameters,
    },
    getAgentConversationToolHandler,
  );

  server.registerTool(
    'agent_conversation_get_messages',
    {
      description: getAgentConversationMessagesToolDescription,
      inputSchema: getAgentConversationMessagesToolParameters,
    },
    getAgentConversationMessagesToolHandler,
  );

  server.registerTool(
    'agent_conversation_list',
    {
      description: listAgentConversationsToolDescription,
      inputSchema: listAgentConversationsToolParameters,
    },
    listAgentConversationsToolHandler,
  );
}
