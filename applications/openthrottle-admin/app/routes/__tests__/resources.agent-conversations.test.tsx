// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createActionArgs } from '@openthrottle/react-router-testing';

vi.mock('~/global/utils/utils.agents-chat', () => ({
  handleDeleteAgentConversationIntent: vi.fn(),
  handleListAgentConversationsIntent: vi.fn(),
  handleLoadAgentConversationMessagesIntent: vi.fn(),
  handleRenameAgentConversationIntent: vi.fn(),
}));

const {
  handleDeleteAgentConversationIntent,
  handleListAgentConversationsIntent,
  handleLoadAgentConversationMessagesIntent,
  handleRenameAgentConversationIntent,
} = await import('~/global/utils/utils.agents-chat');
const { action } = await import('../resources.agent-conversations');
type ActionArgs = Parameters<typeof action>[0];

const mockList = vi.mocked(handleListAgentConversationsIntent);
const mockLoadMessages = vi.mocked(handleLoadAgentConversationMessagesIntent);
const mockRename = vi.mocked(handleRenameAgentConversationIntent);
const mockDelete = vi.mocked(handleDeleteAgentConversationIntent);

describe('routes/resources.agent-conversations action (admin)', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockLoadMessages.mockReset();
    mockRename.mockReset();
    mockDelete.mockReset();
  });

  test('dispatches the list intent to the list handler', async () => {
    mockList.mockResolvedValue({
      conversations: [],
      errorMessage: null,
      totalCount: 0,
    });

    const result = await action(
      createActionArgs<ActionArgs>({
        body: { intent: 'list' },
        url: 'http://localhost/resources/agent-conversations',
      }),
    );

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      conversations: [],
      errorMessage: null,
      totalCount: 0,
    });
  });

  test('dispatches the load-messages intent to the load-messages handler', async () => {
    mockLoadMessages.mockResolvedValue({
      conversationId: 'c1',
      errorMessage: null,
      messages: [],
    });

    const result = await action(
      createActionArgs<ActionArgs>({
        body: { conversationId: 'c1', intent: 'load-messages' },
        url: 'http://localhost/resources/agent-conversations',
      }),
    );

    expect(mockLoadMessages).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      conversationId: 'c1',
      errorMessage: null,
      messages: [],
    });
  });

  test('dispatches the rename intent to the rename handler', async () => {
    mockRename.mockResolvedValue({ conversation: null, errorMessage: null });

    await action(
      createActionArgs<ActionArgs>({
        body: { conversationId: 'c1', intent: 'rename', title: 'New' },
        url: 'http://localhost/resources/agent-conversations',
      }),
    );

    expect(mockRename).toHaveBeenCalledTimes(1);
  });

  test('dispatches the delete intent to the delete handler', async () => {
    mockDelete.mockResolvedValue({ conversation: null, errorMessage: null });

    await action(
      createActionArgs<ActionArgs>({
        body: { conversationId: 'c1', intent: 'delete' },
        url: 'http://localhost/resources/agent-conversations',
      }),
    );

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  test('returns null for an unrecognized intent', async () => {
    const result = await action(
      createActionArgs<ActionArgs>({
        body: { intent: 'unknown' },
        url: 'http://localhost/resources/agent-conversations',
      }),
    );

    expect(result).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
    expect(mockLoadMessages).not.toHaveBeenCalled();
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
