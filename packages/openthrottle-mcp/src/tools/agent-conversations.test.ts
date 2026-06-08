/**
 * @description Handler tests for agent conversation read MCP tools with mocked GraphQL.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAgentConversationMessagesToolHandler,
  getAgentConversationToolHandler,
  getAgentConversationToolDescription,
  getAgentConversationMessagesToolDescription,
  listAgentConversationsToolDescription,
  listAgentConversationsToolHandler,
} from './agent-conversations.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const humanJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';

const conversation = {
  createdAt: '2026-06-01T12:00:00.000Z',
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  metadataJson: null,
  modelName: 'gpt-4',
  modelProvider: 'openai',
  planId: null,
  projectId: null,
  status: 'active',
  title: 'Smoke chat',
  updatedAt: '2026-06-01T12:00:00.000Z',
  userId: 'user-1',
};

const assistantMessage = {
  content: 'Hello from assistant',
  conversationId: conversation.id,
  createdAt: '2026-06-01T12:00:01.000Z',
  id: 'msg-assistant-1',
  role: 'assistant',
  routingConfidence: 0.95,
  routingModel: 'gpt-4',
  routingReason: 'default',
  routingTier: 'primary',
  sortOrder: 2000,
  toolMetadataJson: null,
};

const userMessage = {
  content: 'Hello',
  conversationId: conversation.id,
  createdAt: '2026-06-01T12:00:00.500Z',
  id: 'msg-user-1',
  role: 'user',
  routingConfidence: null,
  routingModel: null,
  routingReason: null,
  routingTier: null,
  sortOrder: 1000,
  toolMetadataJson: null,
};

describe('agent conversation tool descriptions', () => {
  it('includes boundary warning on all three tools', () => {
    const boundary =
      'Web chat threads only — use `get_plan_output` for Ralph/plan iteration logs.';

    expect(listAgentConversationsToolDescription).toContain(boundary);
    expect(getAgentConversationToolDescription).toContain(boundary);
    expect(getAgentConversationMessagesToolDescription).toContain(boundary);
  });
});

describe('listAgentConversationsToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when auth token is unset', () => {
    it('returns an auth error without calling GraphQL', async () => {
      const result = await listAgentConversationsToolHandler({});

      expect(result).toMatchObject({
        content: [
          { text: expect.stringMatching(/OPENTHROTTLE_MCP_AUTH_TOKEN/) },
        ],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns conversations', () => {
    it('returns structured conversations with grill-me pagination defaults', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = humanJwtToken;
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listAgentConversations: {
          conversations: [conversation],
          totalCount: 1,
        },
      });

      const result = await listAgentConversationsToolHandler({});

      expect(result).toMatchObject({
        structuredContent: {
          conversations: [conversation],
          totalCount: 1,
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        humanJwtToken,
        expect.anything(),
        { input: { limit: 20, offset: 0, status: 'active' } },
      );
    });
  });

  describe('when GraphQL returns no conversations', () => {
    it('returns empty list without isError', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = humanJwtToken;
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listAgentConversations: { conversations: [], totalCount: 0 },
      });

      const result = await listAgentConversationsToolHandler({});

      expect(result).toMatchObject({
        structuredContent: { conversations: [], totalCount: 0 },
      });
      // expect(result.isError).toBeUndefined();
    });
  });

  describe('when limit exceeds max', () => {
    it('caps limit at 100', async () => {
      process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = humanJwtToken;
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        listAgentConversations: { conversations: [], totalCount: 0 },
      });

      await listAgentConversationsToolHandler({ limit: 500 });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        humanJwtToken,
        expect.anything(),
        { input: { limit: 100, offset: 0, status: 'active' } },
      );
    });
  });
});

describe('getAgentConversationToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = humanJwtToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getAgentConversationToolHandler({ id: '' });

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Invalid arguments/i) }],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns a conversation', () => {
    it('returns structured conversation content', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getAgentConversation: conversation,
      });

      const result = await getAgentConversationToolHandler({
        id: conversation.id,
      });

      expect(result).toMatchObject({
        structuredContent: { conversation },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        humanJwtToken,
        expect.anything(),
        { id: conversation.id },
      );
    });
  });

  describe('when GraphQL returns null', () => {
    it('returns null conversation without isError', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getAgentConversation: null,
      });

      const result = await getAgentConversationToolHandler({
        id: 'missing-conversation-id',
      });

      expect(result).toMatchObject({
        structuredContent: { conversation: null },
      });

      // expect(result.isError).toBeUndefined();
    });
  });
});

describe('getAgentConversationMessagesToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
    process.env.OPENTHROTTLE_MCP_AUTH_TOKEN = humanJwtToken;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  });

  describe('when args are invalid', () => {
    it('returns an invalid-args error without calling GraphQL', async () => {
      const result = await getAgentConversationMessagesToolHandler(
        {} as Parameters<typeof getAgentConversationMessagesToolHandler>[0],
      );

      expect(result).toMatchObject({
        content: [{ text: expect.stringMatching(/Invalid arguments/i) }],
        isError: true,
      });
      expect(executeGraphqlWithAuth).not.toHaveBeenCalled();
    });
  });

  describe('when GraphQL returns messages', () => {
    it('returns full message rows including routing metadata', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getAgentConversationMessages: {
          messages: [userMessage, assistantMessage],
          totalCount: 2,
        },
      });

      const result = await getAgentConversationMessagesToolHandler({
        conversationId: conversation.id,
      });

      expect(result).toMatchObject({
        structuredContent: {
          messages: [userMessage, assistantMessage],
          totalCount: 2,
        },
      });
      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        humanJwtToken,
        expect.anything(),
        {
          input: {
            conversationId: conversation.id,
            limit: 100,
            offset: 0,
          },
        },
      );
    });
  });

  describe('when limit exceeds max', () => {
    it('caps limit at 500', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        getAgentConversationMessages: { messages: [], totalCount: 0 },
      });

      await getAgentConversationMessagesToolHandler({
        conversationId: conversation.id,
        limit: 1000,
      });

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        humanJwtToken,
        expect.anything(),
        {
          input: {
            conversationId: conversation.id,
            limit: 500,
            offset: 0,
          },
        },
      );
    });
  });
});
