import { describe, expect, it, vi } from 'vitest';

import type { ToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import {
  buildRequestBody,
  createAnthropicToolSelector,
  parseResponseBody,
} from './anthropic-tool-selector.ts';

const surface: ToolSurface = {
  instructions: 'OT rules.',
  tools: [
    {
      description: 'Get a plan.',
      inputSchema: { properties: {}, type: 'object' },
      name: 'get_plan',
    },
  ],
};

const harnessTools = [
  { description: 'Run.', input_schema: { type: 'object' }, name: 'bash' },
];

const okBody = {
  content: [
    { text: 'Fetching.', type: 'text' },
    { id: 'tu_1', input: { id: 'p1' }, name: 'get_plan', type: 'tool_use' },
  ],
  stop_reason: 'tool_use',
  usage: {
    cache_creation_input_tokens: 5,
    cache_read_input_tokens: 7,
    input_tokens: 11,
    output_tokens: 13,
  },
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

describe('buildRequestBody', () => {
  it('offers OT and harness tools with auto choice, caching the system prefix', () => {
    const body = buildRequestBody(
      { effort: 'low', harnessTools, model: 'm', surface },
      'hi',
    );

    expect(body).toMatchObject({
      messages: [{ content: 'hi', role: 'user' }],
      model: 'm',
      output_config: { effort: 'low' },
      system: [{ cache_control: { type: 'ephemeral' }, type: 'text' }],
      tool_choice: { type: 'auto' },
      tools: [
        {
          description: 'Get a plan.',
          input_schema: { type: 'object' },
          name: 'get_plan',
        },
        { name: 'bash' },
      ],
    });
    expect(JSON.stringify(body)).toContain('OT rules.');
  });
});

describe('parseResponseBody', () => {
  it('extracts tool calls, text and usage', () => {
    expect(parseResponseBody(okBody)).toEqual({
      calls: [{ input: { id: 'p1' }, name: 'get_plan' }],
      kind: 'calls',
      text: 'Fetching.',
      usage: {
        cacheReadInputTokens: 7,
        cacheWriteInputTokens: 5,
        inputTokens: 11,
        outputTokens: 13,
      },
    });
  });

  it('reports a refusal as an error', () => {
    expect(parseResponseBody({ content: [], stop_reason: 'refusal' })).toEqual({
      kind: 'error',
      message: 'model refused',
    });
  });

  it('reports a malformed body as an error', () => {
    expect(parseResponseBody({ nope: true }).kind).toBe('error');
  });
});

describe('createAnthropicToolSelector', () => {
  const options = {
    apiKey: 'k',
    baseUrl: 'https://api.test',
    effort: 'medium',
    harnessTools,
    maxRetries: 1,
    model: 'm',
    surface,
  };

  it('posts to the Messages API with the key and version headers', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(200, okBody));
    const selection = await createAnthropicToolSelector({
      ...options,
      fetchImpl,
    }).select('hi');

    expect(selection.kind).toBe('calls');
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe('https://api.test/v1/messages');
    expect(init?.headers).toMatchObject({
      'anthropic-version': '2026-10-21',
      'x-api-key': 'k',
    });
  });

  describe('when the API returns a retryable status', () => {
    it('retries, then succeeds', async () => {
      vi.useFakeTimers();
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(529, { error: 'overloaded' }))
        .mockResolvedValueOnce(jsonResponse(200, okBody));
      const pending = createAnthropicToolSelector({
        ...options,
        fetchImpl,
      }).select('hi');
      await vi.runAllTimersAsync();

      expect((await pending).kind).toBe('calls');
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  describe('when the API returns a non-retryable status', () => {
    it('returns an error without retrying', async () => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(400, { error: 'bad' }));
      const selection = await createAnthropicToolSelector({
        ...options,
        fetchImpl,
      }).select('hi');

      expect(selection).toMatchObject({ kind: 'error' });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
  });

  describe('when fetch throws', () => {
    it('returns the error message', async () => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error('ECONNRESET'));

      expect(
        await createAnthropicToolSelector({ ...options, fetchImpl }).select(
          'hi',
        ),
      ).toEqual({
        kind: 'error',
        message: 'ECONNRESET',
      });
    });
  });
});
