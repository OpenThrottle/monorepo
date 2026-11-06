import { describe, expect, it } from 'vitest';

import { createOpencodeEventMapper } from '../events.ts';
import { OPENCODE_1_18_TOOL_USE_EVENTS } from './opencode-1-18-tool-use.fixture.ts';

const step = (sessionID: string) => {
  return {
    part: { id: 'prt_s', messageID: 'msg_1', sessionID, type: 'step-start' },
    sessionID,
    type: 'step_start',
  };
};

const text = (id: string, text: string, sessionID = 'ses_1') => {
  return {
    part: { id, messageID: 'msg_1', text, type: 'text' },
    sessionID,
    type: 'text',
  };
};

describe('createOpencodeEventMapper', () => {
  it('surfaces the minted session id exactly once, from the first event', () => {
    const mapper = createOpencodeEventMapper();

    const first = mapper.map(step('ses_1'));
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      kind: 'session',
      metadata: { sessionId: 'ses_1' },
    });

    // A later event with the same sessionID does not re-emit a session chunk.
    const second = mapper.map(text('prt_1', 'hello'));
    expect(second.every((chunk) => chunk.kind !== 'session')).toBe(true);
  });

  it('emits only the appended suffix across snapshots sharing a part id', () => {
    const mapper = createOpencodeEventMapper();
    mapper.map(step('ses_1'));

    const a = mapper.map(text('prt_1', 'hello'));
    const b = mapper.map(text('prt_1', 'hello world'));
    // A repeated identical snapshot yields nothing (no growth).
    const c = mapper.map(text('prt_1', 'hello world'));

    expect(a.map((chunk) => chunk.delta)).toEqual(['hello']);
    expect(b.map((chunk) => chunk.delta)).toEqual([' world']);
    expect(c).toEqual([]);
  });

  it('tracks separate parts independently', () => {
    const mapper = createOpencodeEventMapper();
    mapper.map(step('ses_1'));

    expect(mapper.map(text('prt_1', 'aaa')).map((c) => c.delta)).toEqual([
      'aaa',
    ]);
    expect(mapper.map(text('prt_2', 'bbb')).map((c) => c.delta)).toEqual([
      'bbb',
    ]);
  });

  it('maps a running tool part to tool_call and a completed one to tool_result', () => {
    const mapper = createOpencodeEventMapper();
    mapper.map(step('ses_1'));

    const running = mapper.map({
      part: {
        callID: 'call_1',
        state: { status: 'running' },
        tool: 'read',
        type: 'tool',
      },
      sessionID: 'ses_1',
      type: 'tool',
    });
    expect(running[0]).toMatchObject({
      kind: 'tool_call',
      metadata: { callId: 'call_1', tool: 'read', toolName: 'read' },
    });

    const done = mapper.map({
      part: {
        callID: 'call_1',
        state: { output: 'file', status: 'completed' },
        tool: 'read',
        type: 'tool',
      },
      sessionID: 'ses_1',
      type: 'tool',
    });
    expect(done[0]).toMatchObject({
      error: null,
      kind: 'tool_result',
      metadata: { isError: false, toolCall: 'file', toolName: 'read' },
    });
  });

  it('stores each tool output once, never the raw part that repeats it', () => {
    const mapper = createOpencodeEventMapper();
    const output = 'x'.repeat(1000);

    const chunks = mapper.map({
      part: {
        callID: 'call_big',
        state: {
          input: { filePath: '/repo/big.txt' },
          metadata: { output },
          output,
          status: 'completed',
        },
        tool: 'read',
        type: 'tool',
      },
      sessionID: 'ses_1',
      type: 'tool_use',
    });

    for (const chunk of chunks) {
      expect(chunk.metadata).not.toHaveProperty('toolPart');
    }
    // The persisted turn is capped at 64 KB, so the output must appear once.
    const serialized = JSON.stringify(chunks);
    expect(serialized.split(output)).toHaveLength(2);
  });

  describe('a failed tool part', () => {
    it('marks the result isError with the error text, at chunk and metadata level', () => {
      const mapper = createOpencodeEventMapper();

      const chunks = mapper.map({
        part: {
          callID: 'call_err',
          state: {
            error: 'File not found: /repo/missing.txt',
            input: { filePath: '/repo/missing.txt' },
            status: 'error',
          },
          tool: 'read',
          type: 'tool',
        },
        sessionID: 'ses_1',
        type: 'tool_use',
      });
      const result = chunks.find((c) => c.kind === 'tool_result');

      expect(result).toMatchObject({
        error: 'File not found: /repo/missing.txt',
        metadata: {
          callId: 'call_err',
          isError: true,
          toolCall: 'File not found: /repo/missing.txt',
        },
      });
    });

    it('falls back to a generic message when the error part carries no text', () => {
      const mapper = createOpencodeEventMapper();

      const chunks = mapper.map({
        part: {
          callID: 'call_err',
          state: { status: 'error' },
          tool: 'read',
          type: 'tool',
        },
        sessionID: 'ses_1',
        type: 'tool_use',
      });

      expect(chunks.find((c) => c.kind === 'tool_result')).toMatchObject({
        metadata: { isError: true, toolCall: 'tool error' },
      });
    });
  });

  describe('opencode 1.18 `tool_use` events', () => {
    it('maps every call in a captured stream to a tool_call then a tool_result', () => {
      const mapper = createOpencodeEventMapper();
      const chunks = OPENCODE_1_18_TOOL_USE_EVENTS.flatMap((event) =>
        mapper.map(event),
      );
      const toolChunks = chunks
        .filter((c) => c.kind === 'tool_call' || c.kind === 'tool_result')
        .map((c) => ({
          callId: c.metadata?.callId,
          isError: c.metadata?.isError,
          kind: c.kind,
          toolCall: c.metadata?.toolCall,
          toolName: c.metadata?.toolName,
        }));

      expect(toolChunks).toEqual([
        {
          callId: 'call_07095c4b546840c6a0d6f087',
          isError: undefined,
          kind: 'tool_call',
          toolCall: { command: 'pwd' },
          toolName: 'bash',
        },
        {
          callId: 'call_07095c4b546840c6a0d6f087',
          isError: false,
          kind: 'tool_result',
          toolCall: '/repo\n',
          toolName: 'bash',
        },
        {
          callId: expect.any(String),
          isError: undefined,
          kind: 'tool_call',
          toolCall: { filePath: '/repo/does-not-exist/missing.txt' },
          toolName: 'read',
        },
        {
          callId: expect.any(String),
          isError: true,
          kind: 'tool_result',
          toolCall: 'File not found: /repo/does-not-exist/missing.txt',
          toolName: 'read',
        },
      ]);
    });

    it('opens the call before its result when the first sighting is already terminal', () => {
      const mapper = createOpencodeEventMapper();

      const chunks = mapper.map({
        part: {
          callID: 'call_1',
          state: {
            input: { command: 'ls' },
            output: 'a\n',
            status: 'completed',
          },
          tool: 'bash',
          type: 'tool',
        },
        sessionID: 'ses_1',
        type: 'tool_use',
      });

      expect(chunks.map((c) => c.kind)).toEqual([
        'session',
        'tool_call',
        'tool_result',
      ]);
    });

    it('does not reopen a call that a running event already started', () => {
      const mapper = createOpencodeEventMapper();
      const part = (status: string) => {
        return {
          part: {
            callID: 'call_1',
            state: { input: { command: 'ls' }, status },
            tool: 'bash',
            type: 'tool',
          },
          sessionID: 'ses_1',
          type: 'tool_use',
        };
      };

      mapper.map(part('running'));
      const done = mapper.map(part('completed'));

      expect(done.map((c) => c.kind)).toEqual(['tool_result']);
    });
  });

  it('maps step_finish to a usage chunk with tokens and cost', () => {
    const mapper = createOpencodeEventMapper();
    mapper.map(step('ses_1'));

    const usage = mapper.map({
      part: { cost: 0, tokens: { total: 10 }, type: 'step-finish' },
      sessionID: 'ses_1',
      type: 'step_finish',
    });
    expect(usage[0]).toMatchObject({
      kind: 'usage',
      metadata: { cost: 0, tokens: { total: 10 } },
    });
  });

  it('never emits a terminal done chunk (that is the driver on process exit)', () => {
    const mapper = createOpencodeEventMapper();
    const all = [
      ...mapper.map(step('ses_1')),
      ...mapper.map(text('prt_1', 'x')),
      ...mapper.map({
        part: { type: 'step-finish' },
        sessionID: 'ses_1',
        type: 'step_finish',
      }),
    ];
    expect(all.some((chunk) => chunk.done)).toBe(false);
  });
});
