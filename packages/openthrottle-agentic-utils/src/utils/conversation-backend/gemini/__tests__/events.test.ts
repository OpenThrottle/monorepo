/**
 * Event-mapping tests for the gemini adapter, using the event shapes the
 * 0.25.2 emitter writes verbatim (docs/openthrottle/gemini-stream-json-schema.md
 * §2/§9): assistant deltas, correlated tool_use/tool_result, model remembered
 * from init, and a terminal result on both the success and error paths.
 */

import { describe, expect, it } from 'vitest';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../../types.ts';
import { createGeminiEventMapper } from '../events.ts';

const TS = '2026-08-25T00:00:00.000Z';

describe('createGeminiEventMapper', () => {
  it('maps assistant message deltas to text chunks and skips user echoes', () => {
    const map = createGeminiEventMapper();
    expect(
      map({ content: 'hi', role: 'user', timestamp: TS, type: 'message' }),
    ).toEqual([]);
    expect(
      map({
        content: 'Hello',
        delta: true,
        role: 'assistant',
        timestamp: TS,
        type: 'message',
      }),
    ).toEqual([
      {
        delta: 'Hello',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      },
    ]);
  });

  it('maps tool_use and tool_result to correlated tool chunks', () => {
    const map = createGeminiEventMapper();
    const [call] = map({
      parameters: { file_path: 'a.txt' },
      timestamp: TS,
      tool_id: 'call-1',
      tool_name: 'read_file',
      type: 'tool_use',
    });
    expect(call).toEqual({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
      metadata: {
        callId: 'call-1',
        toolCall: { name: 'read_file', parameters: { file_path: 'a.txt' } },
      },
    });

    const [result] = map({
      output: 'hello',
      status: 'success',
      timestamp: TS,
      tool_id: 'call-1',
      type: 'tool_result',
    });
    expect(result).toEqual({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
      metadata: {
        callId: 'call-1',
        toolCall: { error: null, output: 'hello', status: 'success' },
      },
    });
  });

  it('emits no session chunk for init but remembers the model for usage', () => {
    const map = createGeminiEventMapper();
    expect(
      map({
        model: 'gemini-2.5-pro',
        session_id: 'abc',
        timestamp: TS,
        type: 'init',
      }),
    ).toEqual([]);

    const [terminal] = map({
      stats: { input_tokens: 10, output_tokens: 3, total_tokens: 13 },
      status: 'success',
      timestamp: TS,
      type: 'result',
    });
    expect(terminal).toEqual({
      delta: '',
      done: true,
      error: null,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
      metadata: {
        model: 'gemini-2.5-pro',
        usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 },
      },
    });
  });

  it('attaches the error message on a terminal error result', () => {
    const map = createGeminiEventMapper();
    const [terminal] = map({
      error: { message: 'quota exhausted', type: 'ApiError' },
      stats: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      status: 'error',
      timestamp: TS,
      type: 'result',
    });
    expect(terminal?.done).toBe(true);
    expect(terminal?.error).toBe('quota exhausted');
    expect(terminal?.kind).toBe(CONVERSATION_STREAM_CHUNK_KINDS.usage);
  });

  it('skips non-fatal error events and unknown types', () => {
    const map = createGeminiEventMapper();
    expect(
      map({
        message: 'Loop detected, stopping execution',
        severity: 'warning',
        timestamp: TS,
        type: 'error',
      }),
    ).toEqual([]);
    expect(map({ type: 'mystery' })).toEqual([]);
    expect(map('not json object')).toEqual([]);
  });
});
