import { describe, expect, it } from 'vitest';

import { mapClaudeEvent } from '../events.ts';

/** The single chunk an event maps to, or null when it maps to none. */
const mapOne = (
  event: unknown,
): ReturnType<typeof mapClaudeEvent>[number] | null => {
  const chunks = mapClaudeEvent(event);
  expect(chunks.length).toBeLessThanOrEqual(1);

  return chunks[0] ?? null;
};

describe('mapClaudeEvent', () => {
  it('maps system/init to a session chunk', () => {
    expect(
      mapOne({ session_id: 'sid-9', subtype: 'init', type: 'system' }),
    ).toMatchObject({
      kind: 'session',
      metadata: { sessionId: 'sid-9' },
    });
  });

  it('ignores non-init system subtypes', () => {
    expect(mapOne({ subtype: 'hook_started', type: 'system' })).toBeNull();
  });

  it('maps a nested content_block_delta text_delta to a text chunk', () => {
    expect(
      mapOne({
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
      mapOne({
        event: {
          delta: { thinking: 'hmm', type: 'thinking_delta' },
          type: 'content_block_delta',
        },
        type: 'stream_event',
      }),
    ).toMatchObject({ delta: 'hmm', kind: 'thinking' });

    expect(
      mapOne({
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
      mapOne({
        event: {
          content_block: { id: 'toolu_1', name: 'Read', type: 'tool_use' },
          index: 1,
          type: 'content_block_start',
        },
        type: 'stream_event',
      }),
    ).toMatchObject({
      kind: 'tool_call',
      metadata: { callId: 'toolu_1', name: 'Read', toolName: 'Read' },
    });
  });

  it('drops input_json_delta fragments (the full input arrives on the assistant event)', () => {
    expect(
      mapOne({
        event: {
          delta: { partial_json: '{"file_pa', type: 'input_json_delta' },
          index: 1,
          type: 'content_block_delta',
        },
        type: 'stream_event',
      }),
    ).toBeNull();
  });

  it('maps a consolidated tool_use block to a tool_call carrying the full input', () => {
    expect(
      mapOne({
        message: {
          content: [
            {
              id: 'toolu_1',
              input: { file_path: '/a.ts' },
              name: 'Read',
              type: 'tool_use',
            },
          ],
          role: 'assistant',
        },
        type: 'assistant',
      }),
    ).toEqual({
      delta: '',
      done: false,
      kind: 'tool_call',
      metadata: {
        callId: 'toolu_1',
        name: 'Read',
        toolCall: { file_path: '/a.ts' },
        toolName: 'Read',
      },
    });
  });

  it('maps every tool_use block of a parallel batch to its own tool_call', () => {
    const chunks = mapClaudeEvent({
      message: {
        content: [
          { text: 'running three', type: 'text' },
          {
            id: 'toolu_1',
            input: { command: 'ls' },
            name: 'Bash',
            type: 'tool_use',
          },
          {
            id: 'toolu_2',
            input: { command: 'pwd' },
            name: 'Bash',
            type: 'tool_use',
          },
          {
            id: 'toolu_3',
            input: { pattern: '*.ts' },
            name: 'Glob',
            type: 'tool_use',
          },
        ],
        role: 'assistant',
      },
      type: 'assistant',
    });

    expect(chunks.map((chunk) => chunk.metadata)).toEqual([
      expect.objectContaining({
        callId: 'toolu_1',
        toolCall: { command: 'ls' },
      }),
      expect.objectContaining({
        callId: 'toolu_2',
        toolCall: { command: 'pwd' },
      }),
      expect.objectContaining({
        callId: 'toolu_3',
        toolCall: { pattern: '*.ts' },
      }),
    ]);
  });

  it('skips the consolidated assistant echo (double-count guard)', () => {
    expect(
      mapOne({
        message: { content: [{ text: 'x', type: 'text' }], role: 'assistant' },
        type: 'assistant',
      }),
    ).toBeNull();
  });

  it('maps a user tool_result to a tool_result correlated by tool_use_id', () => {
    expect(
      mapOne({
        message: {
          content: [
            { content: 'ok', tool_use_id: 'toolu_1', type: 'tool_result' },
          ],
        },
        type: 'user',
      }),
    ).toEqual({
      delta: '',
      done: false,
      kind: 'tool_result',
      metadata: { callId: 'toolu_1', isError: false, toolCall: 'ok' },
    });
  });

  it('joins block-array result content into text', () => {
    expect(
      mapOne({
        message: {
          content: [
            {
              content: [
                { text: 'line one', type: 'text' },
                { source: {}, type: 'image' },
                { text: 'line two', type: 'text' },
              ],
              tool_use_id: 'toolu_1',
              type: 'tool_result',
            },
          ],
        },
        type: 'user',
      })?.metadata?.toolCall,
    ).toBe('line one\n[image]\nline two');
  });

  it('flags an is_error tool_result', () => {
    expect(
      mapOne({
        message: {
          content: [
            {
              content: 'user declined the approval',
              is_error: true,
              tool_use_id: 'toolu_1',
              type: 'tool_result',
            },
          ],
        },
        type: 'user',
      })?.metadata,
    ).toMatchObject({ callId: 'toolu_1', isError: true });
  });

  it('maps each result of a parallel batch to its own correlated chunk', () => {
    const chunks = mapClaudeEvent({
      message: {
        content: ['toolu_1', 'toolu_2', 'toolu_3'].map((id) => ({
          content: `out ${id}`,
          tool_use_id: id,
          type: 'tool_result',
        })),
      },
      type: 'user',
    });

    expect(chunks.map((chunk) => [chunk.kind, chunk.metadata?.callId])).toEqual(
      [
        ['tool_result', 'toolu_1'],
        ['tool_result', 'toolu_2'],
        ['tool_result', 'toolu_3'],
      ],
    );
  });

  it('maps result (is_error:false) to a terminal usage chunk with no error', () => {
    expect(
      mapOne({
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
    const chunk = mapOne({
      is_error: true,
      result: 'model_not_found',
      subtype: 'success',
      type: 'result',
    });
    expect(chunk).toMatchObject({ done: true, kind: 'usage' });
    expect(chunk?.error).toBe('model_not_found');
  });

  it('maps a rejected rate_limit_event to a usage_limit chunk with an ISO resetsAt', () => {
    expect(
      mapOne({
        rate_limit_info: {
          rateLimitType: 'five_hour',
          resetsAt: 1_800_000_000,
          status: 'rejected',
        },
        type: 'rate_limit_event',
      }),
    ).toEqual({
      delta: '',
      done: false,
      kind: 'usage_limit',
      metadata: {
        rateLimitType: 'five_hour',
        resetsAt: new Date(1_800_000_000_000).toISOString(),
      },
    });
  });

  it('maps a rejected rate_limit_event with no reset info to nulls', () => {
    expect(
      mapOne({
        rate_limit_info: { status: 'rejected' },
        type: 'rate_limit_event',
      }),
    ).toMatchObject({
      kind: 'usage_limit',
      metadata: { rateLimitType: null, resetsAt: null },
    });
  });

  it('maps allowed / allowed_warning / malformed rate_limit_events to null', () => {
    for (const info of [
      { status: 'allowed' },
      { resetsAt: 1_800_000_000, status: 'allowed_warning' },
      undefined,
    ]) {
      expect(
        mapOne({ rate_limit_info: info, type: 'rate_limit_event' }),
      ).toBeNull();
    }
    expect(mapOne({ type: 'rate_limit_event' })).toBeNull();
  });

  it('ignores non-records', () => {
    expect(mapOne('nope')).toBeNull();
  });

  it('forwards api_error_status and flags a 429 result as a usage limit', () => {
    const chunk = mapOne({
      api_error_status: 429,
      is_error: true,
      result: 'whatever the CLI says',
      type: 'result',
    });

    expect(chunk).toMatchObject({
      done: true,
      error: 'whatever the CLI says',
      metadata: {
        apiErrorStatus: 429,
        usageLimit: { rateLimitType: null, resetsAt: null },
      },
    });
  });

  it('does not flag a non-429 or successful result as a usage limit', () => {
    const serverError = mapOne({
      api_error_status: 500,
      is_error: true,
      result: 'boom',
      type: 'result',
    });
    expect(serverError?.metadata).toMatchObject({ apiErrorStatus: 500 });
    expect(serverError?.metadata).not.toHaveProperty('usageLimit');

    const ok = mapOne({
      is_error: false,
      result: 'ok',
      type: 'result',
    });
    expect(ok?.metadata).toMatchObject({ apiErrorStatus: null });
    expect(ok?.metadata).not.toHaveProperty('usageLimit');
  });
});
