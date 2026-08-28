import { describe, expect, it } from 'vitest';

import { mapClaudeEvent } from '../events.ts';

describe('mapClaudeEvent', () => {
  it('maps system/init to a session chunk', () => {
    expect(
      mapClaudeEvent({ session_id: 'sid-9', subtype: 'init', type: 'system' }),
    ).toMatchObject({
      kind: 'session',
      metadata: { sessionId: 'sid-9' },
    });
  });

  it('ignores non-init system subtypes', () => {
    expect(
      mapClaudeEvent({ subtype: 'hook_started', type: 'system' }),
    ).toBeNull();
  });

  it('maps a nested content_block_delta text_delta to a text chunk', () => {
    expect(
      mapClaudeEvent({
        event: {
          delta: { text: 'ello world', type: 'text_delta' },
          index: 0,
          type: 'content_block_delta',
        },
        type: 'stream_event',
      }),
    ).toMatchObject({ delta: 'ello world', done: false, kind: 'text' });
  });

  it('maps a thinking_delta to a thinking chunk and ignores signature_delta', () => {
    expect(
      mapClaudeEvent({
        event: {
          delta: { thinking: 'hmm', type: 'thinking_delta' },
          type: 'content_block_delta',
        },
        type: 'stream_event',
      }),
    ).toMatchObject({ delta: 'hmm', kind: 'thinking' });

    expect(
      mapClaudeEvent({
        event: {
          delta: { signature: 'abc', type: 'signature_delta' },
          type: 'content_block_delta',
        },
        type: 'stream_event',
      }),
    ).toBeNull();
  });

  it('maps a tool_use content_block_start to a tool_call chunk', () => {
    expect(
      mapClaudeEvent({
        event: {
          content_block: { id: 'toolu_1', name: 'Read', type: 'tool_use' },
          index: 1,
          type: 'content_block_start',
        },
        type: 'stream_event',
      }),
    ).toMatchObject({
      kind: 'tool_call',
      metadata: { name: 'Read', toolName: 'Read', toolUseId: 'toolu_1' },
    });
  });

  it('skips the consolidated assistant echo (double-count guard)', () => {
    expect(
      mapClaudeEvent({
        message: { content: [{ text: 'x', type: 'text' }], role: 'assistant' },
        type: 'assistant',
      }),
    ).toBeNull();
  });

  it('maps a user tool_result event to a tool_result chunk', () => {
    const chunk = mapClaudeEvent({
      message: {
        content: [
          { content: 'ok', tool_use_id: 'toolu_1', type: 'tool_result' },
        ],
      },
      type: 'user',
    });
    expect(chunk?.kind).toBe('tool_result');
    expect(chunk?.metadata?.toolResults).toHaveLength(1);
  });

  it('maps result (is_error:false) to a terminal usage chunk with no error', () => {
    expect(
      mapClaudeEvent({
        is_error: false,
        result: 'hello world',
        subtype: 'success',
        total_cost_usd: 0.04,
        type: 'result',
      }),
    ).toMatchObject({
      done: true,
      error: null,
      kind: 'usage',
      metadata: { result: 'hello world', totalCostUsd: 0.04 },
    });
  });

  it('gates the terminal error on is_error, not subtype', () => {
    const chunk = mapClaudeEvent({
      is_error: true,
      result: 'model_not_found',
      subtype: 'success',
      type: 'result',
    });
    expect(chunk).toMatchObject({ done: true, kind: 'usage' });
    expect(chunk?.error).toBe('model_not_found');
  });

  it('ignores rate_limit_event and non-records', () => {
    expect(mapClaudeEvent({ type: 'rate_limit_event' })).toBeNull();
    expect(mapClaudeEvent('nope')).toBeNull();
  });
});
