import { describe, expect, it } from 'vitest';

import type { ConversationStreamChunk } from '../../types.ts';
import { createCodexEventMapper } from '../events.ts';

/** Map one event on a fresh mapper; null when it yields no chunk. */
const mapCodexEvent = (event: unknown): ConversationStreamChunk | null => {
  return createCodexEventMapper().map(event)[0] ?? null;
};

/** Map a whole stream on one mapper, flattening its chunks. */
const mapStream = (events: readonly unknown[]): ConversationStreamChunk[] => {
  const mapper = createCodexEventMapper();

  return events.flatMap((event) => {
    return mapper.map(event);
  });
};

// The item shapes below are the real ones persisted for codex conversation
// 479cf7c4-283a-4d9b-a67e-6e7151824bce (plan 971b5b35).
const FAILED_READ = {
  aggregated_output: `cat: does-not-exist/missing.txt: No such file or directory\n`,
  command: "/bin/zsh -lc 'cat does-not-exist/missing.txt'",
  exit_code: 1,
  id: 'item_1',
  status: 'failed',
  type: 'command_execution',
};

const LIST_FILES = {
  aggregated_output: 'README.md\npackage.json\n',
  command: "/bin/zsh -lc 'ls'",
  exit_code: 0,
  id: 'item_2',
  status: 'completed',
  type: 'command_execution',
};

describe('mapCodexEvent', () => {
  it('maps thread.started to a session chunk carrying the thread id', () => {
    expect(
      mapCodexEvent({ thread_id: 'th_1', type: 'thread.started' }),
    ).toMatchObject({
      done: false,
      kind: 'session',
      metadata: { sessionId: 'th_1' },
    });
  });

  it('maps a completed agent_message item to a text chunk', () => {
    expect(
      mapCodexEvent({
        item: { id: 'i1', item_type: 'agent_message', text: 'pong' },
        type: 'item.completed',
      }),
    ).toMatchObject({ delta: 'pong', done: false, kind: 'text' });
  });

  it('maps a completed reasoning item to a thinking chunk', () => {
    expect(
      mapCodexEvent({
        item: { id: 'i2', item_type: 'reasoning', text: 'let me think' },
        type: 'item.completed',
      }),
    ).toMatchObject({ delta: 'let me think', done: false, kind: 'thinking' });
  });

  it('reads the item discriminant from `type` when `item_type` is absent', () => {
    expect(
      mapCodexEvent({
        item: { text: 'hi', type: 'agent_message' },
        type: 'item.completed',
      }),
    ).toMatchObject({ delta: 'hi', kind: 'text' });
  });

  it('maps turn.completed to a terminal usage chunk with no error', () => {
    const chunk = mapCodexEvent({
      type: 'turn.completed',
      usage: { input_tokens: 10, output_tokens: 3 },
    });
    expect(chunk).toMatchObject({
      done: true,
      error: null,
      kind: 'usage',
      metadata: { usage: { input_tokens: 10, output_tokens: 3 } },
    });
  });

  it('maps turn.failed to a terminal error chunk', () => {
    expect(
      mapCodexEvent({ error: { message: 'boom' }, type: 'turn.failed' }),
    ).toMatchObject({ done: true, error: 'boom' });
  });

  it('maps a bare error event to a terminal error chunk', () => {
    expect(
      mapCodexEvent({ message: 'network down', type: 'error' }),
    ).toMatchObject({ done: true, error: 'network down' });
  });

  it('skips lifecycle events (turn.started, text item.started/updated) and non-objects', () => {
    expect(mapCodexEvent({ type: 'turn.started' })).toBeNull();
    expect(
      mapCodexEvent({
        item: { item_type: 'agent_message' },
        type: 'item.started',
      }),
    ).toBeNull();
    expect(mapCodexEvent('nope')).toBeNull();
  });

  // A REAL failure envelope captured from `codex exec --json` (host creds were
  // expired at authoring time). Verifies the envelope maps to: an early session
  // chunk, then a terminal error carrying codex's own message. The `error` event
  // arrives before `turn.failed`, so the driver's first terminal chunk wins.
  it('maps the real expired-auth failure stream (session then terminal error)', () => {
    const raw = [
      {
        thread_id: '019fab65-bab1-7343-a32e-1d0cadd24055',
        type: 'thread.started',
      },
      { type: 'turn.started' },
      {
        message: `Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again.`,
        type: 'error',
      },
      {
        error: {
          message: `Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again.`,
        },
        type: 'turn.failed',
      },
    ];

    const chunks = raw
      .map(mapCodexEvent)
      .filter((chunk): chunk is NonNullable<typeof chunk> => chunk !== null);

    expect(chunks[0]).toMatchObject({ kind: 'session' });
    const firstTerminal = chunks.find((chunk) => chunk.done);
    expect(firstTerminal?.error).toContain('refresh token');
  });
});

describe('createCodexEventMapper tool items', () => {
  describe('a command_execution that succeeds', () => {
    it('opens a card with the unwrapped command and resolves it with the output', () => {
      expect(mapStream([{ item: LIST_FILES, type: 'item.completed' }])).toEqual(
        [
          {
            delta: '',
            done: false,
            kind: 'tool_call',
            metadata: {
              callId: 'item_2',
              itemType: 'command_execution',
              toolCall: { command: 'ls' },
              toolName: 'command_execution',
            },
          },
          {
            delta: '',
            done: false,
            kind: 'tool_result',
            metadata: {
              callId: 'item_2',
              isError: false,
              itemType: 'command_execution',
              toolCall: 'README.md\npackage.json\n',
              toolName: 'command_execution',
            },
          },
        ],
      );
    });
  });

  describe('a command_execution that fails', () => {
    it('marks the result isError and carries the error text', () => {
      const result = mapStream([
        { item: FAILED_READ, type: 'item.completed' },
      ]).find((chunk) => chunk.kind === 'tool_result');

      expect(result?.metadata).toMatchObject({
        callId: 'item_1',
        isError: true,
        toolCall: FAILED_READ.aggregated_output,
      });
    });

    it('is an error on a non-zero exit even when status says completed', () => {
      const result = mapStream([
        {
          item: { ...FAILED_READ, aggregated_output: '', status: 'completed' },
          type: 'item.completed',
        },
      ]).find((chunk) => chunk.kind === 'tool_result');

      expect(result?.metadata).toMatchObject({
        isError: true,
        toolCall: 'Exited with code 1.',
      });
    });
  });

  describe('item.started then item.completed', () => {
    it('opens the card once, on start, and resolves it on completion', () => {
      const chunks = mapStream([
        {
          item: {
            ...LIST_FILES,
            aggregated_output: '',
            exit_code: null,
            status: 'in_progress',
          },
          type: 'item.started',
        },
        { item: LIST_FILES, type: 'item.completed' },
      ]);

      expect(chunks.map((chunk) => chunk.kind)).toEqual([
        'tool_call',
        'tool_result',
      ]);
      expect(chunks[0]?.metadata).toMatchObject({
        callId: 'item_2',
        toolCall: { command: 'ls' },
      });
    });
  });

  describe('parallel items', () => {
    it('keep their own item ids as distinct callIds', () => {
      const callIds = mapStream([
        { item: FAILED_READ, type: 'item.started' },
        { item: LIST_FILES, type: 'item.started' },
        { item: LIST_FILES, type: 'item.completed' },
        { item: FAILED_READ, type: 'item.completed' },
      ]).map((chunk) => chunk.metadata?.callId);

      expect(callIds).toEqual(['item_1', 'item_2', 'item_2', 'item_1']);
    });
  });

  describe('an mcp_tool_call', () => {
    const call = {
      arguments: { id: 'abc' },
      id: 'item_5',
      server: 'openthrottle-mcp',
      tool: 'get_plan',
      type: 'mcp_tool_call',
    };

    it('shows server, tool and arguments, and its result', () => {
      const chunks = mapStream([
        {
          item: { ...call, result: { content: [] }, status: 'completed' },
          type: 'item.completed',
        },
      ]);

      expect(chunks[0]?.metadata?.toolCall).toEqual({
        arguments: { id: 'abc' },
        server: 'openthrottle-mcp',
        tool: 'get_plan',
      });
      expect(chunks[1]?.metadata).toMatchObject({
        isError: false,
        toolCall: { content: [] },
      });
    });

    it('fails with the error message', () => {
      const chunks = mapStream([
        {
          item: { ...call, error: { message: 'not found' }, status: 'failed' },
          type: 'item.completed',
        },
      ]);

      expect(chunks[1]?.metadata).toMatchObject({
        isError: true,
        toolCall: 'not found',
      });
    });
  });

  describe('an unknown item kind', () => {
    it('keeps the raw item as its result so the card is never empty', () => {
      const item = { id: 'item_9', payload: 42, type: 'future_kind' };
      const chunks = mapStream([{ item, type: 'item.completed' }]);

      expect(chunks[1]?.metadata).toMatchObject({
        callId: 'item_9',
        isError: false,
        toolCall: item,
        toolName: 'future_kind',
      });
    });
  });

  describe('an item with no id', () => {
    it('emits only the result, which cannot be paired with a call', () => {
      const chunks = mapStream([
        { item: { query: 'nx', type: 'web_search' }, type: 'item.completed' },
      ]);

      expect(chunks.map((chunk) => chunk.kind)).toEqual(['tool_result']);
    });
  });
});
