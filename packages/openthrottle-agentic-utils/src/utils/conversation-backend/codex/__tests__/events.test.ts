import { describe, expect, it } from 'vitest';

import { mapCodexEvent } from '../events.ts';

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

  it('maps other completed items (command_execution, mcp_tool_call) to tool_result', () => {
    const chunk = mapCodexEvent({
      item: { command: 'ls', id: 'c1', item_type: 'command_execution' },
      type: 'item.completed',
    });
    expect(chunk).toMatchObject({
      done: false,
      kind: 'tool_result',
      metadata: { itemType: 'command_execution' },
    });
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

  it('skips lifecycle events (turn.started, item.started/updated) and non-objects', () => {
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
        message:
          'Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again.',
        type: 'error',
      },
      {
        error: {
          message:
            'Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again.',
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
