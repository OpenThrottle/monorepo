import type Anthropic from '@anthropic-ai/sdk';
import { APIError } from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';

import type { ToolSurface } from '../../../model-facing-text/listToolSurface.ts';
import type { AnthropicMessagesClient } from '../anthropic-tool-selector.ts';
import {
  buildRequestBody,
  createAnthropicToolSelector,
  parseMessage,
} from '../anthropic-tool-selector.ts';

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
  {
    description: 'Run.',
    input_schema: { type: 'object' as const },
    name: 'bash',
  },
];

const okMessage: Anthropic.Message = {
  container: null,
  content: [
    { citations: null, text: 'Fetching.', type: 'text' },
    {
      caller: { type: 'direct' },
      id: 'tu_1',
      input: { id: 'p1' },
      name: 'get_plan',
      type: 'tool_use',
    },
  ],
  diagnostics: null,
  id: 'msg_1',
  model: 'm',
  role: 'assistant',
  stop_details: null,
  stop_reason: 'tool_use',
  stop_sequence: null,
  type: 'message',
  usage: {
    cache_creation: null,
    cache_creation_input_tokens: 5,
    cache_read_input_tokens: 7,
    inference_geo: null,
    input_tokens: 11,
    output_tokens: 13,
    output_tokens_details: null,
    server_tool_use: null,
    service_tier: null,
    speed: null,
  },
};

const mockClient = (
  create: AnthropicMessagesClient['messages']['create'],
): AnthropicMessagesClient => {
  return { messages: { create } };
};

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

describe('parseMessage', () => {
  it('extracts tool calls, text and usage', () => {
    expect(parseMessage(okMessage)).toEqual({
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
    expect(
      parseMessage({
        ...okMessage,
        content: [],
        stop_reason: 'refusal',
      }),
    ).toEqual({
      kind: 'error',
      message: 'model refused',
    });
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

  it('calls messages.create with the request body and returns the selection', async () => {
    const create = vi.fn().mockResolvedValue(okMessage);
    const selection = await createAnthropicToolSelector({
      ...options,
      client: mockClient(create),
    }).select('hi');

    expect(selection.kind).toBe('calls');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      messages: [{ content: 'hi', role: 'user' }],
      model: 'm',
      tool_choice: { type: 'auto' },
    });
  });

  describe('when the API returns an APIError', () => {
    it('returns an error without falling back', async () => {
      const create = vi.fn().mockRejectedValue(
        new APIError(
          400,
          {
            error: { message: 'bad', type: 'invalid_request_error' },
            type: 'error',
          },
          'bad',
          new Headers(),
        ),
      );
      const selection = await createAnthropicToolSelector({
        ...options,
        client: mockClient(create),
      }).select('hi');

      expect(selection).toMatchObject({ kind: 'error' });
      expect(
        String(selection.kind === 'error' ? selection.message : ''),
      ).toContain('HTTP 400');
      expect(create).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the client throws a non-API error', () => {
    it('returns the error message', async () => {
      const create = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      expect(
        await createAnthropicToolSelector({
          ...options,
          client: mockClient(create),
        }).select('hi'),
      ).toEqual({
        kind: 'error',
        message: 'ECONNRESET',
      });
    });
  });
});
