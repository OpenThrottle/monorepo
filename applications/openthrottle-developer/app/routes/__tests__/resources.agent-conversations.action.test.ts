// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.agent-conversations';

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

const mockList = vi.mocked(handleListAgentConversationsIntent);
const mockLoadMessages = vi.mocked(handleLoadAgentConversationMessagesIntent);
const mockRename = vi.mocked(handleRenameAgentConversationIntent);
const mockDelete = vi.mocked(handleDeleteAgentConversationIntent);

const buildArgs = (formData: FormData): Route.ActionArgs => {
  const request = new Request(
    'http://localhost/resources/agent-conversations',
    {
      body: formData,
      method: 'POST',
    },
  );
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/agent-conversations',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.agent-conversations action', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockLoadMessages.mockReset();
    mockRename.mockReset();
    mockDelete.mockReset();
  });

  test('dispatches to the list handler for intent=list', async () => {
    const listResult = {
      conversations: [],
      errorMessage: null,
      totalCount: 0,
    };
    mockList.mockResolvedValue(listResult);

    const formData = new FormData();
    formData.set('intent', 'list');

    const result = await action(buildArgs(formData));

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockLoadMessages).not.toHaveBeenCalled();
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(result).toBe(listResult);
  });

  test('dispatches to the load-messages handler for intent=load-messages', async () => {
    const loadResult = {
      conversationId: 'c1',
      errorMessage: null,
      messages: [],
    };
    mockLoadMessages.mockResolvedValue(loadResult);

    const formData = new FormData();
    formData.set('intent', 'load-messages');
    formData.set('conversationId', 'c1');

    const result = await action(buildArgs(formData));

    expect(mockLoadMessages).toHaveBeenCalledTimes(1);
    expect(result).toBe(loadResult);
  });

  test('dispatches to the rename handler for intent=rename', async () => {
    const renameResult = { conversation: null, errorMessage: null };
    mockRename.mockResolvedValue(renameResult);

    const formData = new FormData();
    formData.set('intent', 'rename');
    formData.set('conversationId', 'c1');
    formData.set('title', 'New title');

    const result = await action(buildArgs(formData));

    expect(mockRename).toHaveBeenCalledTimes(1);
    expect(result).toBe(renameResult);
  });

  test('dispatches to the delete handler for intent=delete', async () => {
    const deleteResult = { conversation: null, errorMessage: null };
    mockDelete.mockResolvedValue(deleteResult);

    const formData = new FormData();
    formData.set('intent', 'delete');
    formData.set('conversationId', 'c1');

    const result = await action(buildArgs(formData));

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(result).toBe(deleteResult);
  });

  test('returns null for an unrecognized intent', async () => {
    const formData = new FormData();
    formData.set('intent', 'unknown-intent');

    const result = await action(buildArgs(formData));

    expect(result).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
    expect(mockLoadMessages).not.toHaveBeenCalled();
    expect(mockRename).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('returns null when no intent is provided', async () => {
    const formData = new FormData();

    const result = await action(buildArgs(formData));

    expect(result).toBeNull();
  });
});
