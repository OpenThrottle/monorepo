// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.conversation-stream';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../resources.conversation-stream');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const buildArgs = (formData: Record<string, string>): Route.ActionArgs => {
  const body = new URLSearchParams(formData);
  const request = new Request(
    'http://localhost/resources/conversation-stream',
    {
      body,
      method: 'POST',
    },
  );
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/resources/conversation-stream',
    request,
    url: new URL(request.url),
  };
};

describe('routes/resources.conversation-stream action', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('cancels the stream and skips it when there is no conversationId', async () => {
    const result = await action(buildArgs({ intent: 'cancel' }));

    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({ cancelled: true });
  });

  test('cancels the stream via GraphQL when a conversationId is present', async () => {
    mockExecute.mockResolvedValue({ cancelConversationStream: true });

    const result = await action(
      buildArgs({ conversationId: 'conv-1', intent: 'cancel' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { conversationId: 'conv-1' },
    );
    expect(result).toEqual({ cancelled: true });
  });

  test('starts a conversation turn and normalizes the result', async () => {
    mockExecute.mockResolvedValue({
      startConversationStream: {
        assistantMessageId: 'assistant-1',
        conversationId: 'conv-1',
        errorMessage: null,
        userMessageId: 'user-1',
      },
    });

    const result = await action(
      buildArgs({ fileMentions: '["a.ts","b.ts"]', message: 'hello' }),
    );

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        input: expect.objectContaining({
          fileMentions: ['a.ts', 'b.ts'],
          message: 'hello',
          persist: null,
        }),
      },
    );
    expect(result).toEqual({
      assistantMessageId: 'assistant-1',
      conversationId: 'conv-1',
      errorMessage: null,
      userMessageId: 'user-1',
    });
  });

  test('sets persist to false when the form requests an ephemeral turn', async () => {
    mockExecute.mockResolvedValue({
      startConversationStream: {
        assistantMessageId: null,
        conversationId: null,
        errorMessage: null,
        userMessageId: null,
      },
    });

    await action(buildArgs({ message: 'hi', persist: 'false' }));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { input: expect.objectContaining({ persist: false }) },
    );
  });

  test('returns an error message when starting the stream throws', async () => {
    mockExecute.mockRejectedValue(new Error('Stream failed to start'));

    const result = await action(buildArgs({ message: 'hello' }));

    expect(result).toEqual({
      assistantMessageId: null,
      conversationId: null,
      errorMessage: 'Stream failed to start',
      userMessageId: null,
    });
  });
});
