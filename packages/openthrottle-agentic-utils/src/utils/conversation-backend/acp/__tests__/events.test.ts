import type { SessionUpdate } from '@agentclientprotocol/sdk';
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
          toolCall: { ok: true },
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

  describe('agy 1.5.9 terminal tool steps (2026-11-15 ACP probe)', () => {
    const PWD_TRANSCRIPT = `Command exited with code 0.\n\nCommand output:\n/repo\r\n`;

    const announce = (
      map: ReturnType<typeof createAcpUpdateMapper>,
      toolCallId: string,
      title: string,
      rawInput: Record<string, unknown>,
    ): void => {
      map({
        kind: 'read',
        rawInput,
        sessionUpdate: 'tool_call',
        status: 'in_progress',
        title,
        toolCallId,
      });
    };

    it('sends a shell transcript as the output alone, never wrapped', () => {
      const map = createAcpUpdateMapper();
      announce(map, 'c1', 'pwd', { CommandLine: 'pwd' });

      const [result] = map({
        content: [
          { content: { text: PWD_TRANSCRIPT, type: 'text' }, type: 'content' },
        ],
        rawOutput: { exit_code: 0, output: PWD_TRANSCRIPT },
        sessionUpdate: 'tool_call_update',
        status: 'completed',
        toolCallId: 'c1',
      });

      expect(result?.metadata).toEqual({
        callId: 'c1',
        isError: false,
        toolCall: PWD_TRANSCRIPT,
        toolName: 'pwd',
      });
    });

    it('takes rawOutput.output when there is no content text', () => {
      const map = createAcpUpdateMapper();
      announce(map, 'c1', 'pwd', { CommandLine: 'pwd' });

      const [result] = map({
        rawOutput: { exit_code: 0, output: PWD_TRANSCRIPT },
        sessionUpdate: 'tool_call_update',
        status: 'completed',
        toolCallId: 'c1',
      });

      expect(result?.metadata?.['toolCall']).toBe(PWD_TRANSCRIPT);
    });

    it('sends null for a completed read that reports no output, not its arguments', () => {
      const map = createAcpUpdateMapper();
      announce(map, 'c2', 'File package.json', { Path: '/repo/package.json' });

      const [result] = map({
        rawInput: { Path: '/repo/package.json' },
        sessionUpdate: 'tool_call_update',
        status: 'completed',
        toolCallId: 'c2',
      });

      expect(result?.metadata).toEqual({
        callId: 'c2',
        isError: false,
        toolCall: null,
        toolName: 'File package.json',
      });
    });

    it('says a refused call was denied instead of failing generically', () => {
      const deniedCallIds = new Set(['c3']);
      const map = createAcpUpdateMapper({ deniedCallIds });
      announce(map, 'c3', 'pwd', { CommandLine: 'pwd' });
      announce(map, 'c4', 'File missing.txt', { Path: '/repo/missing.txt' });
      const failed = (toolCallId: string): SessionUpdate => {
        return {
          content: [{ content: { text: '', type: 'text' }, type: 'content' }],
          rawOutput: { output: '' },
          sessionUpdate: 'tool_call_update',
          status: 'failed',
          toolCallId,
        };
      };

      const [denied] = map(failed('c3'));

      expect(denied?.metadata).toMatchObject({
        isError: true,
        toolCall: 'Permission denied: the tool call was refused.',
      });
    });
  });

  // agy 1.5.13, conv 01a1fbab: `pwd` was refused, and agy cancelled the
  // cascade, so the three calls it had batched behind it came back `failed`
  // with no reason and never ran.
  describe('calls agy cancelled after a refusal (agy 1.5.13)', () => {
    const reasonlessFailure = (toolCallId: string): SessionUpdate => {
      return {
        content: [{ content: { text: '', type: 'text' }, type: 'content' }],
        rawOutput: { output: '' },
        sessionUpdate: 'tool_call_update',
        status: 'failed',
        toolCallId,
      };
    };
    const announce = (
      map: ReturnType<typeof createAcpUpdateMapper>,
      toolCallId: string,
      title: string,
    ): void => {
      map({
        kind: 'read',
        rawInput: { Path: `/repo/${title}` },
        sessionUpdate: 'tool_call',
        status: 'in_progress',
        title,
        toolCallId,
      });
    };

    it('reports a reasonless failure after the refusal as not run', () => {
      const map = createAcpUpdateMapper({ deniedCallIds: new Set(['c1']) });
      announce(map, 'c2', 'File package.json');

      const [result] = map(reasonlessFailure('c2'));

      expect(result?.error).toBeNull();
      expect(result?.metadata).toEqual({
        callId: 'c2',
        isError: false,
        notRun: true,
        toolCall: null,
        toolName: 'File package.json',
      });
    });

    it('keeps the failure of a call that says why it failed', () => {
      const map = createAcpUpdateMapper({ deniedCallIds: new Set(['c1']) });
      announce(map, 'c2', 'File missing.txt');

      const [result] = map({
        content: [
          {
            content: { text: 'file does not exist', type: 'text' },
            type: 'content',
          },
        ],
        sessionUpdate: 'tool_call_update',
        status: 'failed',
        toolCallId: 'c2',
      });

      expect(result?.metadata).toMatchObject({
        isError: true,
        toolCall: 'file does not exist',
      });
      expect(result?.metadata).not.toHaveProperty('notRun');
    });

    it('keeps a generic failure when nothing was refused', () => {
      const map = createAcpUpdateMapper();
      announce(map, 'c2', 'File missing.txt');

      const [result] = map(reasonlessFailure('c2'));

      expect(result?.metadata).toMatchObject({
        isError: true,
        toolCall: 'The agent reported a failed tool call.',
      });
    });

    it('keeps a call that completed after the refusal succeeded', () => {
      const map = createAcpUpdateMapper({ deniedCallIds: new Set(['c1']) });
      announce(map, 'c2', 'File package.json');

      const [result] = map({
        sessionUpdate: 'tool_call_update',
        status: 'completed',
        toolCallId: 'c2',
      });

      expect(result?.metadata).toEqual({
        callId: 'c2',
        isError: false,
        toolCall: null,
        toolName: 'File package.json',
      });
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

  it('lists the refused calls under deniedActions, and only when there are some', () => {
    expect(
      acpTerminalChunk({ stopReason: 'end_turn' }, ['pwd']).metadata,
    ).toEqual({ deniedActions: ['pwd'], stopReason: 'end_turn' });
    expect(acpTerminalChunk({ stopReason: 'end_turn' }, []).metadata).toEqual({
      stopReason: 'end_turn',
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
