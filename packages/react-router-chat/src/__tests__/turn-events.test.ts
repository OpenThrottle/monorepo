import { describe, expect, it } from 'vitest';
import { foldPersistedTurnEvents } from '../turn-events';

const persisted = (events: ReadonlyArray<Record<string, unknown>>): string =>
  JSON.stringify({ events });

describe('foldPersistedTurnEvents', () => {
  it('returns no events when there is nothing persisted', () => {
    expect(foldPersistedTurnEvents(null, 'plain answer')).toEqual([]);
    expect(
      foldPersistedTurnEvents(JSON.stringify({ events: [] }), 'x'),
    ).toEqual([]);
  });

  it('maps a thinking event then the body as a trailing text segment', () => {
    const result = foldPersistedTurnEvents(
      persisted([{ delta: 'mulling', kind: 'thinking', metadata: null }]),
      'the answer',
    );

    expect(result).toEqual([
      { kind: 'thinking', sortOrder: 0, text: 'mulling' },
      { kind: 'text', sortOrder: 1, text: 'the answer' },
      {
        error: null,
        kind: 'usage',
        result: null,
        sortOrder: 2,
        usageJson: null,
      },
    ]);
  });

  it('correlates a persisted tool_call/tool_result into one succeeded tool event', () => {
    const result = foldPersistedTurnEvents(
      persisted([
        {
          delta: '',
          kind: 'tool_call',
          metadata: {
            callId: 'c1',
            toolCall: { readToolCall: { path: 'a.ts' } },
          },
        },
        {
          delta: '',
          kind: 'tool_result',
          metadata: { callId: 'c1', toolCall: { readToolCall: { ok: true } } },
        },
      ]),
      'done',
    );

    const tool = result.find((event) => event.kind === 'tool');
    expect(tool).toMatchObject({
      callId: 'c1',
      kind: 'tool',
      name: 'read',
      status: 'succeeded',
    });
    // one tool event, plus the trailing text + usage marker
    expect(result.filter((e) => e.kind === 'tool')).toHaveLength(1);
    expect(result.some((e) => e.kind === 'usage')).toBe(true);
  });

  it('always appends a terminal usage marker so a replayed turn reads complete', () => {
    const result = foldPersistedTurnEvents(
      persisted([{ delta: 'x', kind: 'thinking', metadata: null }]),
      '',
    );

    expect(result[result.length - 1]).toEqual({
      error: null,
      kind: 'usage',
      result: null,
      sortOrder: 1,
      usageJson: null,
    });
    // no body text -> no text segment
    expect(result.some((e) => e.kind === 'text')).toBe(false);
  });

  it('keeps a session event from persisted metadata', () => {
    const result = foldPersistedTurnEvents(
      persisted([
        { delta: '', kind: 'session', metadata: { sessionId: 'sess-7' } },
      ]),
      'hi',
    );

    expect(result[0]).toEqual({
      kind: 'session',
      sessionId: 'sess-7',
      sortOrder: 0,
    });
  });

  it('surfaces persisted usage (claude) as a single trailing usage event with typed counts', () => {
    const result = foldPersistedTurnEvents(
      persisted([
        {
          delta: '',
          kind: 'usage',
          metadata: {
            result: 'all set',
            totalCostUsd: 0.04,
            usage: { input_tokens: 1200, output_tokens: 340 },
          },
        },
      ]),
      'the answer',
    );

    const usageEvents = result.filter((e) => e.kind === 'usage');
    expect(usageEvents).toEqual([
      {
        error: null,
        kind: 'usage',
        result: 'all set',
        // rendered after the body text segment (sortOrder 1), not at its
        // original persisted index (0).
        sortOrder: 2,
        usage: {
          costUsd: 0.04,
          inputTokens: 1200,
          outputTokens: 340,
          totalTokens: 1540,
        },
        usageJson: JSON.stringify({ input_tokens: 1200, output_tokens: 340 }),
      },
    ]);
    // usage renders last, after the body text.
    expect(result[result.length - 1]?.kind).toBe('usage');
  });

  it('accumulates multiple persisted opencode step-usage events into one', () => {
    const result = foldPersistedTurnEvents(
      persisted([
        {
          delta: '',
          kind: 'usage',
          metadata: { cost: 0, tokens: { input: 100, output: 5 } },
        },
        {
          delta: '',
          kind: 'usage',
          metadata: { cost: 0.01, tokens: { input: 50, output: 8 } },
        },
      ]),
      'done',
    );

    const usageEvents = result.filter((e) => e.kind === 'usage');
    expect(usageEvents).toHaveLength(1);
    expect(usageEvents[0]).toMatchObject({
      kind: 'usage',
      usage: {
        costUsd: 0.01,
        inputTokens: 150,
        outputTokens: 13,
        totalTokens: 163,
      },
    });
  });

  it('legacy turns without persisted usage still render with an empty usage marker (no counts)', () => {
    const result = foldPersistedTurnEvents(
      persisted([{ delta: 'mull', kind: 'thinking', metadata: null }]),
      'the answer',
    );

    const usage = result[result.length - 1];
    expect(usage).toEqual({
      error: null,
      kind: 'usage',
      result: null,
      sortOrder: 2,
      usageJson: null,
    });
    expect('usage' in usage).toBe(false);
  });

  it('tolerates malformed toolMetadataJson', () => {
    expect(foldPersistedTurnEvents('not json', 'body')).toEqual([]);
  });
});
