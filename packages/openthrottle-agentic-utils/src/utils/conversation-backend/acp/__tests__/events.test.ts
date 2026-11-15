import { describe, expect, it } from 'vitest';

import { acpTerminalChunk, createAcpUpdateMapper } from '../events.ts';

describe('createAcpUpdateMapper', () => {
  it('maps message and thought chunks to text and thinking', () => {
    const map = createAcpUpdateMapper();

    expect(
      map({
        content: { text: 'hi', type: 'text' },
        sessionUpdate: 'agent_message_chunk',
      }),
    ).toEqual([{ delta: 'hi', done: false, kind: 'text' }]);
    expect(
      map({
        content: { text: 'hmm', type: 'text' },
        sessionUpdate: 'agent_thought_chunk',
      }),
    ).toEqual([{ delta: 'hmm', done: false, kind: 'thinking' }]);
  });

  it('holds a tool call until its input is known, then emits call and result once', () => {
    const map = createAcpUpdateMapper();

    const announced = map({
      kind: 'edit',
      rawInput: {},
      sessionUpdate: 'tool_call',
      status: 'pending',
      title: 'Edit File',
      toolCallId: 'c1',
    });
    const filled = map({
      rawInput: { path: '/w/a.txt' },
      sessionUpdate: 'tool_call_update',
      toolCallId: 'c1',
    });
    const running = map({
      sessionUpdate: 'tool_call_update',
      status: 'in_progress',
      toolCallId: 'c1',
    });
    const done = map({
      rawOutput: { ok: true },
      sessionUpdate: 'tool_call_update',
      status: 'completed',
      toolCallId: 'c1',
    });

    expect(announced).toEqual([]);
    expect(filled).toEqual([
      {
        delta: '',
        done: false,
        kind: 'tool_call',
        metadata: {
          callId: 'c1',
          toolCall: { path: '/w/a.txt' },
          toolName: 'Edit File',
        },
      },
    ]);
    expect(running).toEqual([]);
    expect(done).toEqual([
      {
        delta: '',
        done: false,
        error: null,
        kind: 'tool_result',
        metadata: {
          callId: 'c1',
          isError: false,
          toolCall: { output: { ok: true }, status: 'completed' },
          toolName: 'Edit File',
        },
      },
    ]);
  });

  it('marks a failed call isError with its content text as the result', () => {
    const map = createAcpUpdateMapper();
    map({
      rawInput: { command: 'cat missing.txt' },
      sessionUpdate: 'tool_call',
      status: 'pending',
      title: 'Shell',
      toolCallId: 'c3',
    });

    const failed = map({
      content: [
        {
          content: { text: 'cat: missing.txt: No such file', type: 'text' },
          type: 'content',
        },
        { terminalId: 't1', type: 'terminal' },
      ],
      rawOutput: { exitCode: 1, stdout: [99, 97, 116] },
      sessionUpdate: 'tool_call_update',
      status: 'failed',
      toolCallId: 'c3',
    });

    expect(failed).toEqual([
      {
        delta: '',
        done: false,
        error: 'cat: missing.txt: No such file',
        kind: 'tool_result',
        metadata: {
          callId: 'c3',
          isError: true,
          toolCall: 'cat: missing.txt: No such file',
          toolName: 'Shell',
        },
      },
    ]);
  });

  it('falls back to a string rawOutput, then a generic message, on failure', () => {
    const map = createAcpUpdateMapper();
    map({ sessionUpdate: 'tool_call', title: 'Edit', toolCallId: 'c4' });
    map({ sessionUpdate: 'tool_call', title: 'Edit', toolCallId: 'c5' });

    const [stringOutput] = map({
      rawOutput: 'permission denied',
      sessionUpdate: 'tool_call_update',
      status: 'failed',
      toolCallId: 'c4',
    }).filter((chunk) => chunk.kind === 'tool_result');
    const [noOutput] = map({
      rawOutput: { code: 13 },
      sessionUpdate: 'tool_call_update',
      status: 'failed',
      toolCallId: 'c5',
    }).filter((chunk) => chunk.kind === 'tool_result');

    expect(stringOutput?.error).toBe('permission denied');
    expect(stringOutput?.metadata).toMatchObject({ isError: true });
    expect(noOutput?.error).toBe('The agent reported a failed tool call.');
    expect(noOutput?.metadata).toMatchObject({
      isError: true,
      toolCall: 'The agent reported a failed tool call.',
    });
  });

  it('emits the call when it starts running even without input', () => {
    const map = createAcpUpdateMapper();
    map({ sessionUpdate: 'tool_call', title: 'MCP: tool', toolCallId: 'c2' });

    const running = map({
      sessionUpdate: 'tool_call_update',
      status: 'in_progress',
      toolCallId: 'c2',
    });

    expect(running.map((chunk) => chunk.kind)).toEqual(['tool_call']);
  });

  it('ignores updates with no chat equivalent', () => {
    const map = createAcpUpdateMapper();

    expect(map({ sessionUpdate: 'session_info_update', title: 'x' })).toEqual(
      [],
    );
    expect(
      map({
        content: { text: 'replayed', type: 'text' },
        sessionUpdate: 'user_message_chunk',
      }),
    ).toEqual([]);
  });
});

describe('acpTerminalChunk', () => {
  it('is a clean finish for end_turn', () => {
    expect(acpTerminalChunk({ stopReason: 'end_turn' })).toMatchObject({
      done: true,
      error: null,
    });
  });

  it('surfaces every other stop reason as the error', () => {
    expect(acpTerminalChunk({ stopReason: 'cancelled' }).error).toBe(
      'cancelled',
    );
    expect(acpTerminalChunk({ stopReason: 'refusal' }).error).toMatch(
      /refused/,
    );
  });
});
