import { describe, expect, it } from 'vitest';
import {
  applyTurnToolCall,
  applyTurnToolResult,
  foldPersistedTurnEvents,
  parseChunkMetadata as parseMeta,
  parseChunkMetadata,
  toolLabelFromMetadataJson,
} from '../turn-events';

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

/**
 * One case per real driver metadata shape, so the resolver is pinned against
 * what each backend in `openthrottle-agentic-utils` actually emits rather than
 * an invented shape. The `name` literal must never surface as a tool name.
 */
describe('tool-name resolution', () => {
  const cases: ReadonlyArray<
    readonly [string, Record<string, unknown>, string]
  > = [
    [
      'canonical toolName wins over every other field',
      {
        name: 'ignored',
        tool: 'ignored',
        toolCall: { name: 'ignored' },
        toolName: 'view_file',
      },
      'view_file',
    ],
    [
      'cursor-agent names its tool with a payload KEY',
      {
        callId: 'c1',
        toolCall: { readToolCall: { path: 'a.ts' }, toolCallId: 'c1' },
      },
      'read',
    ],
    [
      'gemini reports name/parameters on the toolCall payload',
      {
        callId: 't1',
        toolCall: { name: 'view_file', parameters: { path: 'a.ts' } },
      },
      'view_file',
    ],
    [
      'antigravity result payloads carry the name alongside error/output/status',
      {
        callId: '2',
        toolCall: {
          error: null,
          name: 'write_to_file',
          output: null,
          status: 'DONE',
        },
      },
      'write_to_file',
    ],
    ['claude reports metadata.name', { index: 0, name: 'Read' }, 'Read'],
    [
      'opencode reports metadata.tool',
      { callId: 'c9', tool: 'edit', toolPart: { tool: 'edit' } },
      'edit',
    ],
  ];

  it.each(cases)('%s', (_label, metadata, expected) => {
    const json = JSON.stringify(metadata);

    expect(parseChunkMetadata(json).toolName).toBe(expected);
    expect(toolLabelFromMetadataJson(json)).toBe(expected);
  });

  it.each([
    ['absent metadata', null],
    ['empty metadata', JSON.stringify({})],
    ['a payload with no record-valued key', JSON.stringify({ toolCall: {} })],
    ['malformed json', 'not json'],
  ])('falls back to "tool" for %s', (_label, json) => {
    expect(parseChunkMetadata(json).toolName).toBe('tool');
    expect(toolLabelFromMetadataJson(json)).toBe('tool');
  });
});

/**
 * claude streams a tool's arguments as `input_json_delta` chunks carrying only
 * `{ index, partialJson }` — no callId, no name. Folding each into its own event
 * is what made a five-file read render 31 cards, 26 of them headed `tool`.
 */
describe('applyTurnToolCall with identity-less chunks', () => {
  const meta = (metadata: Record<string, unknown>) =>
    parseMeta(JSON.stringify(metadata));

  it('folds claude partial-args chunks into the open call instead of new cards', () => {
    // content_block_start(tool_use) then five input_json_delta chunks.
    const started = applyTurnToolCall(
      [],
      meta({ index: 0, name: 'Read', toolName: 'Read', toolUseId: 'toolu_1' }),
      0,
    );
    const folded = [1, 2, 3, 4, 5].reduce(
      (events, sortOrder) =>
        applyTurnToolCall(
          events,
          meta({ index: 0, partialJson: '{"file' }),
          sortOrder,
        ),
      started,
    );

    expect(folded).toHaveLength(1);
    expect(folded[0]).toMatchObject({ kind: 'tool', name: 'Read' });
  });

  it('still creates a card for an identity-less chunk with no call open', () => {
    const events = applyTurnToolCall([], meta({ partialJson: '{}' }), 0);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'tool', name: 'tool' });
  });

  it('does not fold a NAMED second call into a running first one', () => {
    const first = applyTurnToolCall([], meta({ toolName: 'Read' }), 0);
    const second = applyTurnToolCall(first, meta({ toolName: 'Grep' }), 1);

    expect(second).toHaveLength(2);
    expect(second.map((event) => event.kind === 'tool' && event.name)).toEqual([
      'Read',
      'Grep',
    ]);
  });
});

describe('applyTurnToolResult with identity-less chunks', () => {
  const meta = (metadata: Record<string, unknown>) =>
    parseMeta(JSON.stringify(metadata));

  it('resolves the open call rather than synthesizing a placeholder card', () => {
    // claude's `user` event: the id sits on each block, not on the chunk.
    const started = applyTurnToolCall([], meta({ toolName: 'Read' }), 0);
    const resolved = applyTurnToolResult(
      started,
      meta({ toolResults: [{ content: 'ok', tool_use_id: 'toolu_1' }] }),
      1,
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      kind: 'tool',
      name: 'Read',
      status: 'succeeded',
    });
  });

  it('still synthesizes an event when no call is open', () => {
    const events = applyTurnToolResult([], meta({ toolResults: [] }), 0);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'tool', status: 'succeeded' });
  });

  it('resolves the newest open call when several ran', () => {
    const first = applyTurnToolCall([], meta({ toolName: 'Read' }), 0);
    const second = applyTurnToolCall(first, meta({ toolName: 'Grep' }), 1);
    const resolved = applyTurnToolResult(second, meta({ toolResults: [] }), 2);

    expect(resolved).toHaveLength(2);
    expect(
      resolved.map((event) => event.kind === 'tool' && event.status),
    ).toEqual(['running', 'succeeded']);
  });
});
