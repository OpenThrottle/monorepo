import { renderHook } from '@testing-library/react';
import { parse } from 'graphql';
import { describe, expect, test } from 'vitest';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ChatMessage } from '../../types';
import {
  useConversationStream,
  type ConversationStreamSubscriptionData,
  type ConversationStreamSubscriptionVariables,
} from '../use-conversation-stream';

// A syntactically-valid document so `print(document)` in useSubscription never
// throws; with a null client the subscription never opens, so it is only ever
// serialized, never sent.
const STREAM_DOCUMENT: TypedDocumentNode<
  ConversationStreamSubscriptionData,
  ConversationStreamSubscriptionVariables
> = parse(
  'subscription ConversationStreamChunkAdded($conversationId: ID!) { conversationStreamChunkAdded(conversationId: $conversationId) { delta done kind messageId sortOrder } }',
);

describe('useConversationStream', () => {
  test('returns the seed messages and empty stream state with no conversation', () => {
    const seedMessages: readonly ChatMessage[] = [
      { body: 'hello', id: 'm1', role: 'user' },
    ];

    const { result } = renderHook(() =>
      useConversationStream({
        client: null,
        conversationId: null,
        document: STREAM_DOCUMENT,
        seedMessages,
      }),
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
      }) =>
        useConversationStream({
          client: null,
          conversationId: props.conversationId,
          document: STREAM_DOCUMENT,
          seedMessages: props.seedMessages,
        }),
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
      }) =>
        useConversationStream({
          client: null,
          conversationId: props.conversationId,
          document: STREAM_DOCUMENT,
          seedMessages: props.seedMessages,
        }),
      { initialProps: { conversationId: 'conv-1', seedMessages: seedA } },
    );

    expect(result.current.messages).toEqual(seedA);

    rerender({ conversationId: 'conv-2', seedMessages: seedB });

    expect(result.current.messages).toEqual(seedB);
    expect(result.current.lastActivityAt).toBeNull();
    expect(result.current.completedIds.size).toBe(0);
  });
});
