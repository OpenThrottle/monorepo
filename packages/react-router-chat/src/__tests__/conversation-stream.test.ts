import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../types';
import {
  INITIAL_STREAM_STATE,
  reduceStreamChunk,
  toThreadMessages,
} from '../conversation-stream';

const chunk = (overrides: {
  delta?: string;
  done?: boolean;
  error?: string | null;
  kind?: string;
  messageId?: string;
  metadataJson?: string | null;
  sortOrder: number;
}) => ({
  conversationId: 'conv-1',
  delta: overrides.delta ?? '',
  done: overrides.done ?? false,
  error: overrides.error ?? null,
  id: `chunk-${overrides.sortOrder}`,
  kind: overrides.kind ?? 'text',
  messageId: overrides.messageId ?? 'assistant-1',
  metadataJson: overrides.metadataJson ?? null,
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

  it('does not accumulate non-text kinds (thinking/tool/session) into the body', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));
    state = reduceStreamChunk(
      state,
      chunk({ delta: 'reasoning…', kind: 'thinking', sortOrder: 1 }),
    );
    state = reduceStreamChunk(state, chunk({ delta: ' there', sortOrder: 2 }));

    expect(state.bodies.get('assistant-1')).toBe('Hi there');
  });

  it('renders a tool_call as a dim marker with a best-effort label', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Reading', sortOrder: 0 }));
    state = reduceStreamChunk(
      state,
      chunk({
        kind: 'tool_call',
        metadataJson: JSON.stringify({
          callId: 'c1',
          toolCall: { readToolCall: { args: {} } },
        }),
        sortOrder: 1,
      }),
    );

    const body = state.bodies.get('assistant-1');
    expect(body).toContain('Reading');
    expect(body).toContain('🔧 read');
  });

  it('flips streaming off on the terminal done chunk', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'done?', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ done: true, sortOrder: 1 }));

    expect(state.isStreaming).toBe(false);
    expect(state.bodies.get('assistant-1')).toBe('done?');
  });

  it('records the messageId in completedIds only on the terminal done chunk', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'hi', sortOrder: 0 }));
    expect(state.completedIds.has('assistant-1')).toBe(false);

    state = reduceStreamChunk(state, chunk({ done: true, sortOrder: 1 }));
    expect(state.completedIds.has('assistant-1')).toBe(true);
  });

  it('records completedIds on a terminal error chunk too', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(
      state,
      chunk({ done: true, error: 'boom', sortOrder: 0 }),
    );
    expect(state.completedIds.has('assistant-1')).toBe(true);
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

describe('reduceStreamChunk — structured events', () => {
  const eventsOf = (
    state: ReturnType<typeof reduceStreamChunk>,
    messageId = 'assistant-1',
  ) => state.events.get(messageId) ?? [];

  it('coalesces consecutive text deltas into one ordered text event', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hel', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ delta: 'lo', sortOrder: 1 }));

    expect(eventsOf(state)).toEqual([
      { kind: 'text', sortOrder: 0, text: 'Hello' },
    ]);
  });

  it('keeps thinking in its own segment, interleaved with text in order', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));
    state = reduceStreamChunk(
      state,
      chunk({ delta: 'reason', kind: 'thinking', sortOrder: 1 }),
    );
    state = reduceStreamChunk(
      state,
      chunk({ delta: 'ing', kind: 'thinking', sortOrder: 2 }),
    );
    state = reduceStreamChunk(state, chunk({ delta: ' there', sortOrder: 3 }));

    expect(eventsOf(state)).toEqual([
      { kind: 'text', sortOrder: 0, text: 'Hi' },
      { kind: 'thinking', sortOrder: 1, text: 'reasoning' },
      { kind: 'text', sortOrder: 3, text: ' there' },
    ]);
  });

  it('does not record an event for a duplicate sortOrder', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));
    state = reduceStreamChunk(state, chunk({ delta: 'Hi', sortOrder: 0 }));

    expect(eventsOf(state)).toEqual([
      { kind: 'text', sortOrder: 0, text: 'Hi' },
    ]);
  });

  it('correlates tool_call → tool_result into one succeeded tool event', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(
      state,
      chunk({
        kind: 'tool_call',
        metadataJson: JSON.stringify({
          callId: 'c1',
          toolCall: { readToolCall: { args: { path: 'a.ts' } } },
        }),
        sortOrder: 0,
      }),
    );

    expect(eventsOf(state)).toEqual([
      {
        argsJson: JSON.stringify({ readToolCall: { args: { path: 'a.ts' } } }),
        callId: 'c1',
        error: null,
        kind: 'tool',
        name: 'read',
        resultJson: null,
        sortOrder: 0,
        status: 'running',
      },
    ]);

    state = reduceStreamChunk(
      state,
      chunk({
        kind: 'tool_result',
        metadataJson: JSON.stringify({
          callId: 'c1',
          toolCall: { readToolCall: { result: 'file contents' } },
        }),
        sortOrder: 1,
      }),
    );

    const tool = eventsOf(state)[0];
    expect(tool).toMatchObject({
      callId: 'c1',
      kind: 'tool',
      name: 'read',
      resultJson: JSON.stringify({ readToolCall: { result: 'file contents' } }),
      status: 'succeeded',
    });
    expect(eventsOf(state)).toHaveLength(1);
  });

  it('records a terminal usage event with parsed result/usage', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(state, chunk({ delta: 'done', sortOrder: 0 }));
    state = reduceStreamChunk(
      state,
      chunk({
        done: true,
        kind: 'usage',
        metadataJson: JSON.stringify({
          result: 'all set',
          usage: { totalTokens: 42 },
        }),
        sortOrder: 1,
      }),
    );

    expect(eventsOf(state)).toEqual([
      { kind: 'text', sortOrder: 0, text: 'done' },
      {
        error: null,
        kind: 'usage',
        result: 'all set',
        sortOrder: 1,
        usageJson: JSON.stringify({ totalTokens: 42 }),
      },
    ]);
  });

  it('marks an outstanding tool failed when the turn errors', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(
      state,
      chunk({
        kind: 'tool_call',
        metadataJson: JSON.stringify({
          callId: 'c1',
          toolCall: { editToolCall: {} },
        }),
        sortOrder: 0,
      }),
    );
    state = reduceStreamChunk(
      state,
      chunk({ done: true, error: 'stream aborted', sortOrder: 1 }),
    );

    const tool = eventsOf(state)[0];
    expect(tool).toMatchObject({
      error: 'stream aborted',
      kind: 'tool',
      status: 'failed',
    });
  });

  it('records a session event from session chunk metadata', () => {
    let state = INITIAL_STREAM_STATE;
    state = reduceStreamChunk(
      state,
      chunk({
        kind: 'session',
        metadataJson: JSON.stringify({ sessionId: 'sess-9' }),
        sortOrder: 0,
      }),
    );

    expect(eventsOf(state)).toEqual([
      { kind: 'session', sessionId: 'sess-9', sortOrder: 0 },
    ]);
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

  it('attaches structured events to the streamed assistant message', () => {
    const messages = toThreadMessages(
      seed,
      new Map([['assistant-1', 'hi there']]),
      new Map([
        ['assistant-1', [{ kind: 'text', sortOrder: 0, text: 'hi there' }]],
      ]),
    );

    expect(messages[messages.length - 1]).toEqual({
      body: 'hi there',
      events: [{ kind: 'text', sortOrder: 0, text: 'hi there' }],
      id: 'assistant-1',
      role: 'assistant',
    });
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
