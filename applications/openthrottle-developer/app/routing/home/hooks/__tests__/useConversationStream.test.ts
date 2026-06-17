import type { ChatMessage } from '@openthrottle/react-router-chat';
import { describe, expect, it } from 'vitest';

import {
  INITIAL_STREAM_STATE,
  reduceStreamChunk,
  toThreadMessages,
} from '../useConversationStream';

const chunk = (overrides: {
  delta?: string;
  done?: boolean;
  error?: string | null;
  messageId?: string;
  sortOrder: number;
}) => ({
  conversationId: 'conv-1',
  delta: overrides.delta ?? '',
  done: overrides.done ?? false,
  error: overrides.error ?? null,
  id: `chunk-${overrides.sortOrder}`,
  messageId: overrides.messageId ?? 'assistant-1',
  sortOrder: overrides.sortOrder,
});

describe('reduceStreamChunk', () => {
  it('accumulates deltas in order and marks streaming', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hel', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ delta: 'lo', sortOrder: 1 }));

    expect(state.bodies.get('assistant-1')).toBe('Hello');
    expect(state.isStreaming).toBe(true);
  });

  it('ignores a duplicate sortOrder', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));

    expect(state.bodies.get('assistant-1')).toBe('Hi');
  });

  it('flips streaming off on the terminal done chunk', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'done?', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ done: true, sortOrder: 1 }));

    expect(state.isStreaming).toBe(false);
    expect(state.bodies.get('assistant-1')).toBe('done?');
  });

  it('appends an error note on a terminal error chunk', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'partial', sortOrder: 0 }));
    state = reduceStreamChunk(
      state,
      chunk({ done: true, error: 'connection reset', sortOrder: 1 }),
    );

    expect(state.isStreaming).toBe(false);
    expect(state.bodies.get('assistant-1')).toContain('partial');
    expect(state.bodies.get('assistant-1')).toContain('connection reset');
  });
});

describe('toThreadMessages', () => {
  const seed: ChatMessage[] = [
    { body: 'hi', id: 'user-1', role: 'user' },
    { body: 'hello', id: 'assistant-0', role: 'assistant' },
  ];

  it('appends the in-flight assistant message after seed history', () => {
    const messages = toThreadMessages(
      seed,
      new Map([['assistant-1', 'streaming…']]),
    );

    expect(messages).toEqual([
      { body: 'hi', id: 'user-1', role: 'user' },
      { body: 'hello', id: 'assistant-0', role: 'assistant' },
      { body: 'streaming…', id: 'assistant-1', role: 'assistant' },
    ]);
  });

  it('lets the seed (persisted) version win once history includes the id', () => {
    const messages = toThreadMessages(
      [...seed, { body: 'final', id: 'assistant-1', role: 'assistant' }],
      new Map([['assistant-1', 'streaming…']]),
    );

    expect(messages.filter((m) => m.id === 'assistant-1')).toEqual([
      { body: 'final', id: 'assistant-1', role: 'assistant' },
    ]);
  });
});
