import { describe, expect, it } from 'vitest';

import { createOpencodeEventMapper } from '../events.ts';

const step = (sessionID: string) => ({
  part: { id: 'prt_s', messageID: 'msg_1', sessionID, type: 'step-start' },
  sessionID,
  type: 'step_start',
});

const text = (id: string, text: string, sessionID = 'ses_1') => ({
  part: { id, messageID: 'msg_1', text, type: 'text' },
  sessionID,
  type: 'text',
});

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
      metadata: { toolName: 'read' },
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
