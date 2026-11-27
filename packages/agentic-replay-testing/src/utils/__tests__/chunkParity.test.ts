import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/agentic-conversation-backend';
import { describe, expect, it } from 'vitest';

import {
  chunkShape,
  compareChunkShapes,
  PARITY_FACETS,
  PARITY_TERMINALS,
  retirementVerdict,
} from '../chunkParity.ts';

const chunk = (
  kind: ConversationStreamChunk['kind'],
  extra: Partial<ConversationStreamChunk> = {},
): ConversationStreamChunk => {
  return { delta: '', done: false, kind, ...extra };
};

const end = (error?: string): ConversationStreamChunk => {
  return chunk(KINDS.text, { done: true, error });
};

describe('chunkShape', () => {
  it('drops keepalives and usage and collapses consecutive same-kind chunks', () => {
    const shape = chunkShape([
      chunk(KINDS.session),
      chunk(KINDS.keepalive),
      chunk(KINDS.thinking),
      chunk(KINDS.thinking),
      chunk(KINDS.text, { delta: 'a' }),
      chunk(KINDS.keepalive),
      chunk(KINDS.text, { delta: 'b' }),
      chunk(KINDS.usage),
      end(),
    ]);

    expect(shape.sequence).toEqual(['session', 'thinking', 'text']);
    expect(shape.hasSession).toBe(true);
  });

  describe('terminal', () => {
    it.each([
      [[chunk(KINDS.text)], PARITY_TERMINALS.none],
      [[end()], PARITY_TERMINALS.done],
      [[end('')], PARITY_TERMINALS.done],
      [[end('boom')], PARITY_TERMINALS.error],
      [[end('cancelled')], PARITY_TERMINALS.cancelled],
    ])('%#', (chunks, expected) => {
      expect(chunkShape(chunks).terminal).toBe(expected);
    });
  });

  describe('tools', () => {
    it('counts calls and results and checks they pair in order', () => {
      const paired = chunkShape([
        chunk(KINDS.toolCall),
        chunk(KINDS.toolCall),
        chunk(KINDS.toolResult),
        chunk(KINDS.toolResult),
      ]);
      const orphan = chunkShape([
        chunk(KINDS.toolResult),
        chunk(KINDS.toolCall),
      ]);
      const open = chunkShape([chunk(KINDS.toolCall)]);

      expect(paired).toMatchObject({
        toolCalls: 2,
        toolResults: 2,
        toolsPaired: true,
      });
      expect(orphan.toolsPaired).toBe(false);
      expect(open.toolsPaired).toBe(false);
    });
  });

  describe('thinking', () => {
    it('is before text when it comes first, or when either is absent', () => {
      expect(
        chunkShape([chunk(KINDS.thinking), chunk(KINDS.text)])
          .thinkingBeforeText,
      ).toBe(true);
      expect(
        chunkShape([chunk(KINDS.text), chunk(KINDS.thinking)])
          .thinkingBeforeText,
      ).toBe(false);
      expect(chunkShape([chunk(KINDS.text)]).thinkingBeforeText).toBe(true);
    });
  });

  it('sees usage as a chunk or as terminal metadata, and counts permission chunks', () => {
    expect(chunkShape([chunk(KINDS.usage)]).hasUsage).toBe(true);
    expect(chunkShape([end()]).hasUsage).toBe(false);
    expect(
      chunkShape([chunk(KINDS.text, { done: true, metadata: { usage: {} } })])
        .hasUsage,
    ).toBe(true);
    expect(
      chunkShape([
        chunk(KINDS.permissionRequest),
        chunk(KINDS.permissionRequest),
      ]).permissionChunks,
    ).toBe(2);
  });
});

describe('compareChunkShapes', () => {
  const base = chunkShape([chunk(KINDS.session), chunk(KINDS.text), end()]);

  it('is empty for identical shapes', () => {
    expect(compareChunkShapes(base, base)).toEqual([]);
  });

  it('is empty when only text, ids and counts of same-kind chunks differ', () => {
    const more = chunkShape([
      chunk(KINDS.session),
      chunk(KINDS.text, { delta: 'a' }),
      chunk(KINDS.keepalive),
      chunk(KINDS.text, { delta: 'b' }),
      end(),
    ]);

    expect(compareChunkShapes(base, more)).toEqual([]);
  });

  it('names each facet that differs', () => {
    const other = chunkShape([
      chunk(KINDS.thinking),
      chunk(KINDS.toolCall),
      chunk(KINDS.toolResult),
      chunk(KINDS.permissionRequest),
      chunk(KINDS.usage),
      end('boom'),
    ]);

    const facets = compareChunkShapes(base, other).map((diff) => diff.facet);

    expect(facets).toEqual([
      PARITY_FACETS.terminal,
      PARITY_FACETS.tools,
      PARITY_FACETS.thinking,
      PARITY_FACETS.session,
      PARITY_FACETS.usage,
      PARITY_FACETS.permission,
      PARITY_FACETS.sequence,
    ]);
    expect(
      compareChunkShapes(base, other).find((diff) => diff.facet === 'sequence')
        ?.acp,
    ).toBe('thinking > tool_call > tool_result > permission_request > text');
  });

  it('describes both sides of a difference', () => {
    const cancelled = chunkShape([chunk(KINDS.text), end('cancelled')]);
    const done = chunkShape([chunk(KINDS.text), end()]);

    expect(compareChunkShapes(cancelled, done)[0]).toEqual({
      acp: 'done',
      cli: 'cancelled',
      facet: 'terminal',
    });
  });
});

describe('retirementVerdict', () => {
  it('is GO with no blockers and no missing capability', () => {
    expect(retirementVerdict([], [])).toEqual({ go: true, reasons: [] });
  });

  it('is NO-GO for a blocker or a missing capability, naming both', () => {
    const verdict = retirementVerdict(
      [{ reason: 'unknown model ignored', ref: 'plan 6f45a1ee' }],
      ['supervised edits cannot be gated'],
    );

    expect(verdict).toEqual({
      go: false,
      reasons: [
        'blocker plan 6f45a1ee: unknown model ignored',
        'missing capability: supervised edits cannot be gated',
      ],
    });
  });
});
