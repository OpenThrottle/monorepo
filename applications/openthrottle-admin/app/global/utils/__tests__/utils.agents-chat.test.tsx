// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const {
  handleDeleteAgentConversationIntent,
  handleListAgentConversationsIntent,
  handleLoadAgentConversationMessagesIntent,
  handleRenameAgentConversationIntent,
} = await import('../utils.agents-chat');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);

const request = new Request('http://localhost/resources/agent-conversations');

describe('utils.agents-chat handlers', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  describe('handleLoadAgentConversationMessagesIntent', () => {
    test('returns an error when conversationId is missing', async () => {
      const formData = new FormData();

      const result = await handleLoadAgentConversationMessagesIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversationId: null,
        errorMessage: 'conversationId is required',
        messages: [],
      });
      expect(mockGraphql).not.toHaveBeenCalled();
    });

    test('loads and maps persisted messages', async () => {
      mockGraphql.mockResolvedValue({
        getAgentConversationMessages: {
          messages: [
            {
              content: 'hi',
              createdAt: '2025-01-01T00:00:00.000Z',
              id: 'm1',
              role: 'user',
              routingConfidence: null,
              routingReason: null,
              toolMetadataJson: null,
            },
          ],
        },
      });
      const formData = new FormData();
      formData.set('conversationId', 'c1');

      const result = await handleLoadAgentConversationMessagesIntent(
        request,
        formData,
      );

      expect(result.conversationId).toBe('c1');
      expect(result.errorMessage).toBeNull();
      expect(result.messages).toHaveLength(1);
    });

    test('degrades to an error result when the graphql call rejects', async () => {
      mockGraphql.mockRejectedValue(new Error('boom'));
      const formData = new FormData();
      formData.set('conversationId', 'c1');

      const result = await handleLoadAgentConversationMessagesIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversationId: 'c1',
        errorMessage: 'boom',
        messages: [],
      });
    });
  });

  describe('handleListAgentConversationsIntent', () => {
    test('lists conversations mapped to the sidebar shape', async () => {
      mockGraphql.mockResolvedValue({
        listAgentConversations: {
          conversations: [
            {
              id: 'c1',
              status: 'active',
              title: 'Hello',
              updatedAt: '2025-01-01T00:00:00.000Z',
            },
          ],
          totalCount: 1,
        },
      });
      const formData = new FormData();
      formData.set('limit', '20');
      formData.set('offset', '0');

      const result = await handleListAgentConversationsIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversations: [
          {
            id: 'c1',
            status: 'active',
            title: 'Hello',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        errorMessage: null,
        totalCount: 1,
      });
    });

    test('degrades to an empty list when the graphql call rejects', async () => {
      mockGraphql.mockRejectedValue(new Error('down'));

      const result = await handleListAgentConversationsIntent(
        request,
        new FormData(),
      );

      expect(result).toEqual({
        conversations: [],
        errorMessage: 'down',
        totalCount: 0,
      });
    });
  });

  describe('handleRenameAgentConversationIntent', () => {
    test('returns an error when title is missing', async () => {
      const formData = new FormData();
      formData.set('conversationId', 'c1');

      const result = await handleRenameAgentConversationIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversation: null,
        errorMessage: 'title is required',
      });
      expect(mockGraphql).not.toHaveBeenCalled();
    });

    test('renames a conversation', async () => {
      mockGraphql.mockResolvedValue({
        updateAgentConversationTitle: {
          id: 'c1',
          status: 'active',
          title: 'New title',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
      });
      const formData = new FormData();
      formData.set('conversationId', 'c1');
      formData.set('title', 'New title');

      const result = await handleRenameAgentConversationIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversation: {
          id: 'c1',
          status: 'active',
          title: 'New title',
          updatedAt: '2025-01-02T00:00:00.000Z',
        },
        errorMessage: null,
      });
    });
  });

  describe('handleDeleteAgentConversationIntent', () => {
    test('returns an error when conversationId is missing', async () => {
      const result = await handleDeleteAgentConversationIntent(
        request,
        new FormData(),
      );

      expect(result).toEqual({
        conversation: null,
        errorMessage: 'conversationId is required',
      });
      expect(mockGraphql).not.toHaveBeenCalled();
    });

    test('soft-deletes a conversation', async () => {
      mockGraphql.mockResolvedValue({
        deleteAgentConversation: {
          id: 'c1',
          status: 'deleted',
          title: 'Hello',
          updatedAt: '2025-01-03T00:00:00.000Z',
        },
      });
      const formData = new FormData();
      formData.set('conversationId', 'c1');

      const result = await handleDeleteAgentConversationIntent(
        request,
        formData,
      );

      expect(result).toEqual({
        conversation: {
          id: 'c1',
          status: 'deleted',
          title: 'Hello',
          updatedAt: '2025-01-03T00:00:00.000Z',
        },
        errorMessage: null,
      });
    });
  });
});
