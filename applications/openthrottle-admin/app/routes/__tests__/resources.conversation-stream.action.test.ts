// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createActionArgs } from '@openthrottle/react-router-testing';
import {
  CancelConversationStreamDocument,
  StartConversationStreamDocument,
} from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/resources.conversation-stream';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { action } = await import('../resources.conversation-stream');

const mockGraphql = vi.mocked(executeGraphqlWithAuth);

describe('routes/resources.conversation-stream action (admin)', () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  test('start builds the StartConversationStream input and maps the result', async () => {
    mockGraphql.mockResolvedValue({
      startConversationStream: {
        assistantMessageId: 'a1',
        conversationId: 'c1',
        errorMessage: null,
        userMessageId: 'u1',
      },
    });

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: {
          backend: 'cursor',
          conversationId: '',
          intent: 'start',
          message: 'Build me a feature',
          repositoryId: 'repo-1',
        },
        url: 'http://localhost/resources/conversation-stream',
      }),
    );

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.anything(),
      StartConversationStreamDocument,
      {
        input: expect.objectContaining({
          backend: 'cursor',
          conversationId: null,
          message: 'Build me a feature',
          repositoryId: 'repo-1',
        }),
      },
    );
    expect(result).toEqual({
      assistantMessageId: 'a1',
      conversationId: 'c1',
      errorMessage: null,
      userMessageId: 'u1',
    });
  });

  test('cancel calls CancelConversationStream with the conversationId', async () => {
    mockGraphql.mockResolvedValue({ cancelConversationStream: true });

    const result = await action(
      createActionArgs<Route.ActionArgs>({
        body: { conversationId: 'c1', intent: 'cancel' },
        url: 'http://localhost/resources/conversation-stream',
      }),
    );

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.anything(),
      CancelConversationStreamDocument,
      { conversationId: 'c1' },
    );
    expect(result).toEqual({ cancelled: true });
  });
});
