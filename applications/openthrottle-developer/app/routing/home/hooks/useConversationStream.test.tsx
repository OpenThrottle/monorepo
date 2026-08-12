import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { useConversationStream } from './useConversationStream';

describe('useConversationStream', () => {
  test('returns the seed messages and empty stream state with no conversation', () => {
    const seedMessages: readonly ChatMessage[] = [
      { body: 'hello', id: 'm1', role: 'user' },
    ];

    const { result } = renderHook(() =>
      useConversationStream({ conversationId: null, seedMessages }),
    );

    expect(result.current.messages).toEqual(seedMessages);
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.lastActivityAt).toBeNull();
    expect(result.current.completedIds.size).toBe(0);
    expect(result.current.retryableIds.size).toBe(0);
    expect(result.current.phaseByMessageId.size).toBe(0);
  });

  test('does not throw and reflects seed messages once a conversation id is set (client is stubbed null)', () => {
    const seedMessages: readonly ChatMessage[] = [
      { body: 'first', id: 'm1', role: 'user' },
      { body: 'second', id: 'm2', role: 'assistant' },
    ];

    const initialProps: {
      conversationId: string | null;
      seedMessages: readonly ChatMessage[];
    } = { conversationId: null, seedMessages: [] };

    const { rerender, result } = renderHook(
      (props: {
        conversationId: string | null;
        seedMessages: readonly ChatMessage[];
      }) => useConversationStream(props),
      { initialProps },
    );

    rerender({ conversationId: 'conv-1', seedMessages });

    expect(result.current.messages).toEqual(seedMessages);
    expect(result.current.isStreaming).toBe(false);
  });

  test('resets accumulation state when the conversation id changes', () => {
    const seedA: readonly ChatMessage[] = [
      { body: 'a', id: 'a1', role: 'user' },
    ];
    const seedB: readonly ChatMessage[] = [
      { body: 'b', id: 'b1', role: 'user' },
    ];

    const { rerender, result } = renderHook(
      (props: {
        conversationId: string | null;
        seedMessages: readonly ChatMessage[];
      }) => useConversationStream(props),
      { initialProps: { conversationId: 'conv-1', seedMessages: seedA } },
    );

    expect(result.current.messages).toEqual(seedA);

    rerender({ conversationId: 'conv-2', seedMessages: seedB });

    expect(result.current.messages).toEqual(seedB);
    expect(result.current.lastActivityAt).toBeNull();
    expect(result.current.completedIds.size).toBe(0);
  });
});
