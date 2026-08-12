import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

// Mirrors useHeaderChatController.test.tsx: no ws client so the subscription
// never opens a real socket (SSR-safe no-op path in useConversationStream).
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const { useConversationStream } = await import('../useConversationStream');

describe('useConversationStream', () => {
  test('returns the seed messages unchanged when there is no live client', () => {
    const { result } = renderHook(() =>
      useConversationStream({
        conversationId: 'conv-1',
        seedMessages: [{ body: 'hello', id: 'm1', role: 'user' }],
      }),
    );

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.lastActivityAt).toBeNull();
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.messages).toEqual([
      { body: 'hello', id: 'm1', role: 'user' },
    ]);
  });

  test('resets accumulated stream state when the conversationId changes', () => {
    const { rerender, result } = renderHook(
      (props: { conversationId: string | null }) =>
        useConversationStream({
          conversationId: props.conversationId,
          seedMessages: [],
        }),
      { initialProps: { conversationId: 'conv-1' } },
    );

    expect(result.current.messages).toEqual([]);

    rerender({ conversationId: 'conv-2' });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.lastActivityAt).toBeNull();
  });
});
