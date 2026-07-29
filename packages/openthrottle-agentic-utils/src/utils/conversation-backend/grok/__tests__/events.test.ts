import { describe, expect, it } from 'vitest';

import { mapGrokEvent } from '../events.ts';

describe('mapGrokEvent', () => {
  it('maps a thought event to a thinking delta', () => {
    expect(mapGrokEvent({ data: 'hmm', type: 'thought' })).toEqual([
      { delta: 'hmm', done: false, kind: 'thinking' },
    ]);
  });

  it('maps a text event to a text delta', () => {
    expect(mapGrokEvent({ data: 'pong', type: 'text' })).toEqual([
      { delta: 'pong', done: false, kind: 'text' },
    ]);
  });

  it('maps end to a session chunk then a terminal usage chunk', () => {
    const chunks = mapGrokEvent({
      modelUsage: { 'grok-4.5': { inputTokens: 10 } },
      num_turns: 1,
      sessionId: 'ses-1',
      stopReason: 'EndTurn',
      type: 'end',
      usage: { output_tokens: 3, total_tokens: 13 },
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      done: false,
      kind: 'session',
      metadata: { sessionId: 'ses-1' },
    });
    expect(chunks[1]).toMatchObject({
      done: true,
      error: null,
      kind: 'usage',
      metadata: {
        stopReason: 'EndTurn',
        usage: { output_tokens: 3, total_tokens: 13 },
      },
    });
  });

  it('omits the session chunk when end carries no sessionId', () => {
    const chunks = mapGrokEvent({ type: 'end', usage: {} });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, kind: 'usage' });
  });

  it('maps a defensive error event to a terminal error chunk', () => {
    expect(mapGrokEvent({ message: 'boom', type: 'error' })).toEqual([
      { delta: '', done: true, error: 'boom', kind: 'text' },
    ]);
  });

  it('skips unknown events and non-objects', () => {
    expect(mapGrokEvent({ type: 'tool_use' })).toEqual([]);
    expect(mapGrokEvent('nope')).toEqual([]);
  });

  // A REAL captured grok streaming-json stream (grok 0.2.112). Verifies the full
  // turn maps to: thinking deltas, a text delta, then session + terminal usage.
  it('maps a real captured streaming-json turn end-to-end', () => {
    const raw = [
      { data: 'The', type: 'thought' },
      { data: ' answer', type: 'thought' },
      { data: 'pong', type: 'text' },
      {
        modelUsage: {
          'grok-4.5-build-free': {
            cacheReadInputTokens: 128,
            inputTokens: 14537,
            modelCalls: 1,
            outputTokens: 35,
          },
        },
        num_turns: 1,
        requestId: 'e44cad70-f10f-404d-94e6-2d15aed0e691',
        sessionId: '019fab66-1cd3-70b1-af22-f7dd9554d380',
        stopReason: 'EndTurn',
        type: 'end',
        usage: {
          cache_read_input_tokens: 128,
          input_tokens: 14537,
          output_tokens: 35,
          reasoning_tokens: 34,
          total_tokens: 14700,
        },
      },
    ];

    const chunks = raw.flatMap(mapGrokEvent);

    expect(chunks.map((c) => c.kind)).toEqual([
      'thinking',
      'thinking',
      'text',
      'session',
      'usage',
    ]);
    expect(chunks.find((c) => c.kind === 'text')?.delta).toBe('pong');
    expect(chunks.find((c) => c.kind === 'session')?.metadata?.sessionId).toBe(
      '019fab66-1cd3-70b1-af22-f7dd9554d380',
    );
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null });
  });
});
