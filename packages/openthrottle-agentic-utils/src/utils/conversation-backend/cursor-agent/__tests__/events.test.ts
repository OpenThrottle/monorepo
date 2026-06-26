import { describe, expect, it } from 'vitest';

import { mapCursorEvent } from '../events.ts';

// Fixtures are the verbatim shapes captured in
// docs/openthrottle/cursor-agent-stream-json-schema.md.
describe('mapCursorEvent', () => {
  it('maps system/init to a session-confirmation chunk', () => {
    expect(
      mapCursorEvent({
        cwd: '/x',
        model: 'Auto',
        session_id: '2a5f06af',
        subtype: 'init',
        type: 'system',
      }),
    ).toEqual({
      delta: '',
      done: false,
      kind: 'session',
      metadata: { sessionId: '2a5f06af' },
    });
  });

  it('maps a timestamped assistant event to a text delta', () => {
    expect(
      mapCursorEvent({
        message: {
          content: [{ text: 'hello', type: 'text' }],
          role: 'assistant',
        },
        timestamp_ms: 1781763222114,
        type: 'assistant',
      }),
    ).toEqual({ delta: 'hello', done: false, kind: 'text' });
  });

  it('skips the final consolidated assistant echo (no timestamp_ms)', () => {
    expect(
      mapCursorEvent({
        message: {
          content: [{ text: 'hello world', type: 'text' }],
          role: 'assistant',
        },
        type: 'assistant',
      }),
    ).toBeNull();
  });

  it('maps thinking delta to a thinking chunk and skips thinking completed', () => {
    expect(
      mapCursorEvent({ subtype: 'delta', text: 'Reading…', type: 'thinking' }),
    ).toEqual({ delta: 'Reading…', done: false, kind: 'thinking' });
    expect(
      mapCursorEvent({ subtype: 'completed', type: 'thinking' }),
    ).toBeNull();
  });

  it('maps tool_call started/completed, correlated by call_id', () => {
    const started = mapCursorEvent({
      call_id: 'tool_bf9e',
      subtype: 'started',
      tool_call: { readToolCall: { args: { path: '/x/alpha.txt' } } },
      type: 'tool_call',
    });
    expect(started).toMatchObject({ done: false, kind: 'tool_call' });
    expect(started?.metadata?.callId).toBe('tool_bf9e');

    const completed = mapCursorEvent({
      call_id: 'tool_bf9e',
      subtype: 'completed',
      tool_call: { readToolCall: { result: { success: { content: 'hi' } } } },
      type: 'tool_call',
    });
    expect(completed).toMatchObject({ done: false, kind: 'tool_result' });
    expect(completed?.metadata?.callId).toBe('tool_bf9e');
  });

  it('maps a success result to a terminal chunk with no error', () => {
    expect(
      mapCursorEvent({
        is_error: false,
        result: 'hello world',
        subtype: 'success',
        type: 'result',
        usage: { outputTokens: 35 },
      }),
    ).toMatchObject({ done: true, error: null, kind: 'usage' });
  });

  it('maps is_error:true to a terminal error chunk', () => {
    const chunk = mapCursorEvent({
      is_error: true,
      result: 'something failed',
      subtype: 'success',
      type: 'result',
    });
    expect(chunk).toMatchObject({ done: true, kind: 'usage' });
    expect(chunk?.error).toBe('something failed');
  });

  it('ignores the prompt echo and unknown events', () => {
    expect(
      mapCursorEvent({ message: { content: [], role: 'user' }, type: 'user' }),
    ).toBeNull();
    expect(mapCursorEvent({ type: 'rate_limit_event' })).toBeNull();
    expect(mapCursorEvent('not an object')).toBeNull();
  });
});
