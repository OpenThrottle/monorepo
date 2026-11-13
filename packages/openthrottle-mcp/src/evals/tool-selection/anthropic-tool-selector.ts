/**
 * @description A {@link ToolSelector} backed by the Claude Messages API via `@anthropic-ai/sdk`. One request
 * per trial: the OT tool surface (plus a few generic harness tools), the server instructions in the system
 * prompt the way an MCP client injects them, and the case prompt as the only user turn. The first assistant
 * turn is the selection — no tool is executed and no second turn is sent.
 *
 * Deliberate choices, each load-bearing for a fair same-model comparison:
 * - `tool_choice: auto`, never forced: control cases assert the model picks NO OT tool, and current Claude
 *   models reject forced tool choice anyway.
 * - No server-side refusal fallback (and no `betaRefusalFallbackMiddleware`): a fallback would silently
 *   answer with another model and contaminate a same-model baseline. A refusal is reported as an error
 *   instead.
 * - The stable prefix (tools + system) carries a cache breakpoint, so only the first request of a run pays
 *   full price for the ~60 KB surface.
 */

import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import type { ToolSurface } from '../../model-facing-text/surface.ts';
import type {
  SelectedCall,
  Selection,
  SelectionUsage,
  ToolSelector,
} from './eval-case.ts';

const OUTPUT_EFFORTS = {
  high: 'high',
  low: 'low',
  max: 'max',
  medium: 'medium',
  xhigh: 'xhigh',
} as const;

type OutputEffort = (typeof OUTPUT_EFFORTS)[keyof typeof OUTPUT_EFFORTS];

/**
 * @description Minimal Messages API surface the selector needs — real {@link Anthropic} clients satisfy it,
 * and tests supply a mock.
 */
export interface AnthropicMessagesClient {
  readonly messages: {
    readonly create: (
      body: Anthropic.MessageCreateParamsNonStreaming,
    ) => Promise<Anthropic.Message>;
  };
}

/**
 * @description Options for {@link createAnthropicToolSelector}.
 */
export interface AnthropicToolSelectorOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly client: AnthropicMessagesClient | undefined;
  readonly effort: string;
  readonly harnessTools: readonly HarnessTool[];
  readonly maxRetries: number;
  readonly model: string;
  readonly surface: ToolSurface;
}

/**
 * @description A generic coding-agent tool offered alongside the OT surface, so a control prompt has somewhere
 * other than OT to go — as it would in a real harness.
 */
export interface HarnessTool {
  readonly description: string;
  readonly input_schema: Anthropic.Tool.InputSchema;
  readonly name: string;
}

const MAX_TOKENS = 16000;

const isOutputEffort = (value: string): value is OutputEffort => {
  return Object.hasOwn(OUTPUT_EFFORTS, value);
};

/**
 * @description The system prompt: a minimal coding-agent preamble, then the server instructions under the same
 * heading shape an MCP client uses.
 */
function buildSystemPrompt(instructions: string): string {
  return [
    'You are a coding agent working in a software repository. You have tools from the OpenThrottle MCP server and a few generic repository tools.',
    'Act on the request directly: when a tool fits, call it now with the arguments the request gives you instead of asking a clarifying question. When no tool fits, answer in text.',
    '',
    '# MCP Server Instructions',
    '',
    '## openthrottle-mcp',
    instructions,
  ].join('\n');
}

const toInputSchema = (
  schema: Readonly<Record<string, unknown>>,
): Anthropic.Tool.InputSchema => {
  return {
    ...schema,
    type: 'object',
  };
};

const toApiTool = (tool: Tool): Anthropic.Tool => {
  return {
    description: tool.description ?? '',
    input_schema: toInputSchema(tool.inputSchema),
    name: tool.name,
  };
};

/**
 * @description The Messages API request body for one prompt.
 * @public
 */
export function buildRequestBody(
  options: Pick<
    AnthropicToolSelectorOptions,
    'effort' | 'harnessTools' | 'model' | 'surface'
  >,
  prompt: string,
): Anthropic.MessageCreateParamsNonStreaming {
  const effort: OutputEffort = isOutputEffort(options.effort)
    ? options.effort
    : OUTPUT_EFFORTS.medium;

  return {
    max_tokens: MAX_TOKENS,
    messages: [{ content: prompt, role: 'user' }],
    model: options.model,
    output_config: { effort },
    system: [
      {
        cache_control: { type: 'ephemeral' },
        text: buildSystemPrompt(options.surface.instructions),
        type: 'text',
      },
    ],
    tool_choice: { type: 'auto' },
    tools: [...options.surface.tools.map(toApiTool), ...options.harnessTools],
  };
}

const parseUsage = (usage: Anthropic.Usage): SelectionUsage => {
  return {
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteInputTokens: usage.cache_creation_input_tokens ?? 0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  };
};

/**
 * @description Parses a Messages API response into a {@link Selection}. Tool inputs arrive already parsed as
 * JSON objects; text blocks are concatenated for the report.
 * @public
 */
export function parseMessage(message: Anthropic.Message): Selection {
  if (message.stop_reason === 'refusal') {
    return { kind: 'error', message: 'model refused' };
  }

  const calls = message.content.flatMap((block): SelectedCall[] => {
    if (block.type !== 'tool_use') return [];
    return [{ input: block.input, name: block.name }];
  });
  const text = message.content
    .flatMap((block): string[] => {
      if (block.type !== 'text') return [];
      return [block.text];
    })
    .join('\n');

  return { calls, kind: 'calls', text, usage: parseUsage(message.usage) };
}

const resolveClient = (
  options: AnthropicToolSelectorOptions,
): AnthropicMessagesClient => {
  if (options.client !== undefined) {
    return options.client;
  }

  return new Anthropic({
    apiKey: options.apiKey,
    baseURL: options.baseUrl,
    maxRetries: options.maxRetries,
  });
};

const formatApiError = (error: APIError): string => {
  const status = error.status === undefined ? 'unknown' : String(error.status);

  return `HTTP ${status}: ${error.message.slice(0, 300)}`;
};

/**
 * @description Creates the selector. Retries are delegated to the SDK (`maxRetries` on the client).
 * @public
 */
export function createAnthropicToolSelector(
  options: AnthropicToolSelectorOptions,
): ToolSelector {
  const client = resolveClient(options);

  return {
    model: options.model,
    select: async (prompt: string): Promise<Selection> => {
      try {
        const message = await client.messages.create(
          buildRequestBody(options, prompt),
        );

        return parseMessage(message);
      } catch (error: unknown) {
        if (error instanceof APIError) {
          return { kind: 'error', message: formatApiError(error) };
        }

        return {
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
