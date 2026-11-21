/**
 * Mapper tests for the antigravity stream-json events, driven by output captured verbatim from
 * Antigravity CLI 1.1.21 (docs/openthrottle/antigravity-stream-json-schema.md §3c).
 */

import { describe, expect, it } from 'vitest';

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  CONVERSATION_TOOL_DENIED_ERROR,
} from '../../types.ts';
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

const step = (payload: Record<string, unknown>) => {
  return {
    event: 'step_update',
    step_update: {
      conversation_id: '0da4b6ff-9d67-4d0e-a715-2d8bb8d9d895',
      ...payload,
    },
  };
};

describe('createAntigravityEventMapper', () => {
  it('emits a session chunk from init (agy resumes by id)', () => {
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

  // `tool_info` verbatim from an `agy 1.1.22 --output-format stream-json` run: it is itself
  // `{ name, parameters, output? }`, which is why the payload has to be unwrapped.
  const TOOL_INFO_ACTIVE = {
    name: 'view_file',
    parameters: { AbsolutePath: '/tmp/agycap/sample.txt' },
  };
  const TOOL_INFO_DONE = {
    ...TOOL_INFO_ACTIVE,
    output: '3 lines, 11 bytes',
  };

  it('maps an ACTIVE tool step to a tool call and its terminal state to a tool result', () => {
    const map = createAntigravityEventMapper();

    const active = map(
      step({
        state: 'ACTIVE',
        step_index: 2,
        step_type: 'tool',
        tool_info: TOOL_INFO_ACTIVE,
        tool_name: 'view_file',
      }),
    );
    const done = map(
      step({
        duration_seconds: 0.055337,
        state: 'DONE',
        step_index: 2,
        step_type: 'tool',
        tool_info: TOOL_INFO_DONE,
        tool_name: 'view_file',
      }),
    );

    // The payload is the tool's OWN arguments, not `{ name, parameters: { name, parameters } }` —
    // the name lives on `toolName` and appears exactly once.
    expect(active).toEqual([
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolCall,
        metadata: {
          callId: '2',
          toolCall: { AbsolutePath: '/tmp/agycap/sample.txt' },
          toolName: 'view_file',
        },
      },
    ]);
    expect(done[0]?.kind).toBe(CONVERSATION_STREAM_CHUNK_KINDS.toolResult);
    expect(done[0]?.metadata).toEqual({
      callId: '2',
      isError: false,
      toolCall: '3 lines, 11 bytes',
      toolName: 'view_file',
    });
  });

  it('reports no output, never the arguments, when a DONE step carries none', () => {
    const map = createAntigravityEventMapper();

    // Captured from agy 1.5.9: a read of a missing file comes back DONE with no `output` key.
    const [chunk] = map(
      step({
        state: 'DONE',
        step_index: 6,
        step_type: 'tool',
        tool_info: {
          name: 'read_file',
          parameters: { Path: '/tmp/does-not-exist/missing.txt' },
        },
        tool_name: 'read_file',
      }),
    );

    expect(chunk?.metadata).toEqual({
      callId: '6',
      isError: false,
      toolCall: null,
      toolName: 'read_file',
    });
  });

  it('passes a tool_info with no inner parameters through without dropping keys', () => {
    const map = createAntigravityEventMapper();

    const [call] = map(
      step({
        state: 'ACTIVE',
        step_index: 1,
        step_type: 'tool',
        tool_info: { Command: 'ls -la', Cwd: '/tmp' },
        tool_name: 'run_command',
      }),
    );

    expect(call?.metadata?.toolCall).toEqual({
      Command: 'ls -la',
      Cwd: '/tmp',
    });
  });

  it('marks an ERROR tool step failed with its own message, without ending the turn', () => {
    const map = createAntigravityEventMapper();

    // Captured verbatim from agy 1.5.9: the message nests under `tool_info.error`.
    const chunks = map(
      step({
        duration_seconds: 0.166592,
        state: 'ERROR',
        step_index: 4,
        step_type: 'tool',
        tool_info: {
          error: { message: 'file does not exist', type: 'TOOL_ERROR' },
          name: 'read_file',
          parameters: { Path: '/tmp/agycap/missing.txt' },
        },
        tool_name: 'read_file',
      }),
    );

    // A failed step may be retried under a new step_index, so this must not terminate the
    // stream — only `result` is authoritative.
    expect(chunks).toEqual([
      {
        delta: '',
        done: false,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
        metadata: {
          callId: '4',
          isError: true,
          toolCall: 'file does not exist',
          toolName: 'read_file',
        },
      },
    ]);
  });

  it.each([
    ['a step with no tool_info', {}],
    ['a tool_info with no error', { tool_info: { name: 'run_command' } }],
    ['a blank error message', { tool_info: { error: { message: ' ' } } }],
  ])('falls back to a generic failure for %s', (_label, extra) => {
    const map = createAntigravityEventMapper();

    const [chunk] = map(
      step({
        state: 'ERROR',
        step_index: 2,
        step_type: 'tool',
        tool_name: 'write_to_file',
        ...extra,
      }),
    );

    expect(chunk?.metadata).toEqual({
      callId: '2',
      isError: true,
      toolCall: 'Tool step failed',
      toolName: 'write_to_file',
    });
  });

  it('reads a bare string error on the step itself', () => {
    const map = createAntigravityEventMapper();

    const [chunk] = map(
      step({
        error: 'permission denied',
        state: 'ERROR',
        step_index: 3,
        step_type: 'tool',
        tool_name: 'run_command',
      }),
    );

    expect(chunk?.metadata).toMatchObject({
      isError: true,
      toolCall: 'permission denied',
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

    // The name is no longer repeated inside the payload — `toolName` is where it lives.
    expect(done[0]?.metadata).toMatchObject({ toolName: 'run_command' });
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

  describe('when agy denied a permission', () => {
    // agy 1.5.13, conv 01a1fbb0: the MCP call was refused, agy cancelled the cascade, and the read
    // it had batched behind it came back DONE with no output without having run.
    const DENIAL = `permission check failed for mcp "openthrottle_openthrottle-mcp/health": user denied permission for mcp(openthrottle_openthrottle-mcp/health)`;
    const deniedStep = step({
      state: 'ERROR',
      step_index: 4,
      step_type: 'tool',
      tool_info: {
        error: { message: DENIAL, type: 'TOOL_ERROR' },
        name: 'call_mcp_tool',
      },
      tool_name: 'call_mcp_tool',
    });

    it("words the refused step like the ACP path, not with agy's raw message", () => {
      const map = createAntigravityEventMapper();

      const [chunk] = map(deniedStep);

      expect(chunk?.metadata).toEqual({
        callId: '4',
        isError: true,
        toolCall: CONVERSATION_TOOL_DENIED_ERROR,
        toolName: 'call_mcp_tool',
      });
    });

    it('reports an outputless DONE step after the refusal as not run', () => {
      const map = createAntigravityEventMapper();
      map(deniedStep);

      const [chunk] = map(
        step({
          state: 'DONE',
          step_index: 5,
          step_type: 'tool',
          tool_info: { name: 'read_file', parameters: { Path: '/repo/x' } },
          tool_name: 'read_file',
        }),
      );

      expect(chunk?.metadata).toEqual({
        callId: '5',
        isError: false,
        notRun: true,
        toolCall: null,
        toolName: 'read_file',
      });
    });

    it('keeps a DONE step that reports output after the refusal succeeded', () => {
      const map = createAntigravityEventMapper();
      map(deniedStep);

      const [chunk] = map(
        step({
          state: 'DONE',
          step_index: 5,
          step_type: 'tool',
          tool_info: { name: 'read_file', output: '3 lines, 17 bytes' },
          tool_name: 'read_file',
        }),
      );

      expect(chunk?.metadata).toEqual({
        callId: '5',
        isError: false,
        toolCall: '3 lines, 17 bytes',
        toolName: 'read_file',
      });
    });

    it('keeps an outputless DONE step succeeded when nothing was refused', () => {
      const map = createAntigravityEventMapper();

      const [chunk] = map(
        step({
          state: 'DONE',
          step_index: 5,
          step_type: 'tool',
          tool_name: 'read_file',
        }),
      );

      expect(chunk?.metadata).not.toHaveProperty('notRun');
      expect(chunk?.metadata).toMatchObject({ isError: false, toolCall: null });
    });

    it('lists result.denied_actions on the terminal metadata', () => {
      const map = createAntigravityEventMapper();

      const [terminal] = map({
        event: 'result',
        result: {
          denied_actions: [
            { action: 'mcp', display_name: 'McpTool' },
            { action: 'mcp', display_name: 'McpTool' },
            { action: 'shell' },
          ],
          response: '',
          status: 'SUCCESS',
        },
      });

      expect(terminal).toMatchObject({ done: true, error: null });
      expect(terminal?.metadata?.['deniedActions']).toEqual([
        'McpTool',
        'shell',
      ]);
    });

    it('omits the key when nothing was denied', () => {
      const map = createAntigravityEventMapper();

      const [terminal] = map({
        event: 'result',
        result: { denied_actions: [], response: 'ok', status: 'SUCCESS' },
      });

      expect(terminal?.metadata).not.toHaveProperty('deniedActions');
    });
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
