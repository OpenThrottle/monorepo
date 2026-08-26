/**
 * Mapper tests for the antigravity stream-json events, driven by output captured verbatim from
 * Antigravity CLI 1.1.21 (docs/openthrottle/antigravity-stream-json-schema.md §3c).
 */

import { describe, expect, it } from 'vitest';

import { CONVERSATION_STREAM_CHUNK_KINDS } from '../../types.ts';
import { createAntigravityEventMapper } from '../events.ts';

/** Captured `init` event (tools list truncated; `conversation_id` is top-level). */
const INIT = {
  conversation_id: '0da4b6ff-9d67-4d0e-a715-2d8bb8d9d895',
  event: 'init',
  init: {
    cwd: '/tmp/work',
    model: 'gemini-3.5-flash-low',
    permission_mode: 'request-review',
    tools: ['run_command', 'write_to_file'],
  },
};

const step = (payload: Record<string, unknown>) => ({
  event: 'step_update',
  step_update: {
    conversation_id: '0da4b6ff-9d67-4d0e-a715-2d8bb8d9d895',
    ...payload,
  },
});

describe('createAntigravityEventMapper', () => {
  it('emits a session chunk from init (agy resumes by id, unlike gemini)', () => {
    const map = createAntigravityEventMapper();

    expect(map(INIT)).toEqual([
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.session,
        metadata: { sessionId: '0da4b6ff-9d67-4d0e-a715-2d8bb8d9d895' },
      },
    ]);
  });

  it('ignores the user_input step (echo of our own prompt)', () => {
    const map = createAntigravityEventMapper();

    expect(
      map(step({ state: 'DONE', step_index: 0, step_type: 'user_input' })),
    ).toEqual([]);
  });

  it('forwards each text_delta verbatim as a delta, never accumulating', () => {
    const map = createAntigravityEventMapper();

    // Captured: one step_index emits partial text, then the continuation.
    const first = map(
      step({
        state: 'ACTIVE',
        step_index: 5,
        step_type: 'agent_response',
        text_delta: 'I have created the file [hello.txt](',
      }),
    );
    const second = map(
      step({
        duration_seconds: 2.1,
        state: 'DONE',
        step_index: 5,
        step_type: 'agent_response',
        text_delta: 'file:///tmp/work/hello.txt) containing `hi`.\n',
        usage: { total_tokens: 10 },
      }),
    );

    expect(first).toEqual([
      {
        delta: 'I have created the file [hello.txt](',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      },
    ]);
    expect(second).toEqual([
      {
        delta: 'file:///tmp/work/hello.txt) containing `hi`.\n',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
      },
    ]);
  });

  it('skips a textless agent_response step (usage is reported once by result)', () => {
    const map = createAntigravityEventMapper();

    expect(
      map(
        step({
          duration_seconds: 0.9,
          state: 'DONE',
          step_index: 1,
          step_type: 'agent_response',
          usage: { total_tokens: 13697 },
        }),
      ),
    ).toEqual([]);
  });

  it('maps an ACTIVE tool step to a tool call and its terminal state to a tool result', () => {
    const map = createAntigravityEventMapper();

    const active = map(
      step({
        state: 'ACTIVE',
        step_index: 4,
        step_type: 'tool',
        tool_info: { path: 'hello.txt' },
        tool_name: 'write_to_file',
      }),
    );
    const done = map(
      step({
        duration_seconds: 0.3,
        state: 'DONE',
        step_index: 4,
        step_type: 'tool',
        tool_info: { path: 'hello.txt' },
        tool_name: 'write_to_file',
      }),
    );

    expect(active).toEqual([
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
        metadata: {
          callId: '4',
          toolCall: {
            name: 'write_to_file',
            parameters: { path: 'hello.txt' },
          },
        },
      },
    ]);
    expect(done[0]?.kind).toBe(CONVERSATION_STREAM_CHUNK_KINDS.toolResult);
    expect(done[0]?.metadata).toEqual({
      callId: '4',
      toolCall: {
        error: null,
        name: 'write_to_file',
        output: { path: 'hello.txt' },
        status: 'DONE',
      },
    });
  });

  it('reports a step-level ERROR on the tool result without ending the turn', () => {
    const map = createAntigravityEventMapper();

    const chunks = map(
      step({
        state: 'ERROR',
        step_index: 2,
        step_type: 'tool',
        tool_name: 'write_to_file',
      }),
    );

    // Captured behavior: the tool failed at index 2 and was retried at index 4, so this must not
    // terminate the stream — only `result` is authoritative.
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.done).toBe(false);
    expect(chunks[0]?.metadata).toMatchObject({
      callId: '2',
      toolCall: { error: 'ERROR', status: 'ERROR' },
    });
  });

  it('remembers the tool name across a step whose terminal event omits it', () => {
    const map = createAntigravityEventMapper();

    map(
      step({
        state: 'ACTIVE',
        step_index: 7,
        step_type: 'tool',
        tool_name: 'run_command',
      }),
    );
    const done = map(step({ state: 'DONE', step_index: 7, step_type: 'tool' }));

    expect(done[0]?.metadata).toMatchObject({
      toolCall: { name: 'run_command' },
    });
  });

  it('emits the terminal usage chunk from result, attributing the init model', () => {
    const map = createAntigravityEventMapper();
    map(INIT);

    const chunks = map({
      event: 'result',
      result: {
        conversation_id: '0da4b6ff-9d67-4d0e-a715-2d8bb8d9d895',
        duration_seconds: 0.99,
        num_turns: 1,
        response: 'pong\n',
        status: 'SUCCESS',
        usage: {
          cache_read_tokens: 0,
          input_tokens: 13696,
          output_tokens: 1,
          thinking_tokens: 0,
          total_tokens: 13697,
        },
      },
    });

    expect(chunks).toEqual([
      {
        delta: '',
        done: true,
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
        metadata: {
          model: 'gemini-3.5-flash-low',
          usage: {
            cache_read_tokens: 0,
            input_tokens: 13696,
            output_tokens: 1,
            thinking_tokens: 0,
            total_tokens: 13697,
          },
        },
      },
    ]);
  });

  it('never forwards result.response as text (the double-count rule)', () => {
    const map = createAntigravityEventMapper();

    const chunks = map({
      event: 'result',
      result: { response: 'the complete final text', status: 'SUCCESS' },
    });

    expect(
      chunks.some((chunk) => chunk.delta === 'the complete final text'),
    ).toBe(false);
  });

  it('surfaces the error string when result.status is not SUCCESS', () => {
    const map = createAntigravityEventMapper();

    const chunks = map({
      event: 'result',
      result: {
        error: 'Eligibility check failed: …',
        response: '',
        status: 'ERROR',
      },
    });

    expect(chunks[0]?.done).toBe(true);
    expect(chunks[0]?.error).toBe('Eligibility check failed: …');
  });

  it('falls back to a generic message when a failed result carries no error string', () => {
    const map = createAntigravityEventMapper();

    expect(
      map({ event: 'result', result: { status: 'CANCELLED' } })[0]?.error,
    ).toBe('antigravity reported an error');
  });

  it('ignores unknown events and non-record input', () => {
    const map = createAntigravityEventMapper();

    expect(map({ event: 'telemetry', telemetry: {} })).toEqual([]);
    expect(map('not an object')).toEqual([]);
    expect(map(null)).toEqual([]);
  });
});
