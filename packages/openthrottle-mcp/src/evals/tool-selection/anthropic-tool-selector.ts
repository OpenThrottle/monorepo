/**
 * @description A {@link ToolSelector} backed by the Claude Messages API. One request per trial: the OT tool
 * surface (plus a few generic harness tools), the server instructions in the system prompt the way an MCP
 * client injects them, and the case prompt as the only user turn. The first assistant turn is the selection —
 * no tool is executed and no second turn is sent.
 *
 * Deliberate choices, each load-bearing for a fair same-model comparison:
 * - `tool_choice: auto`, never forced: control cases assert the model picks NO OT tool, and current Claude
 *   models reject forced tool choice anyway.
 * - No server-side refusal fallback: a fallback would silently answer with another model and contaminate a
 *   same-model baseline. A refusal is reported as an error instead.
 * - The stable prefix (tools + system) carries a cache breakpoint, so only the first request of a run pays
 *   full price for the ~60 KB surface.
 *
 * Raw HTTP rather than `@anthropic-ai/sdk`: the package does not depend on the SDK yet (adding it is follow-up
 * work); this file is the only place that changes when it does.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import type { ToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import type {
  SelectedCall,
  Selection,
  SelectionUsage,
  ToolSelector,
} from './eval-case.ts';

/**
 * @description Options for {@link createAnthropicToolSelector}.
 */
export interface AnthropicToolSelectorOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly effort: string;
  readonly fetchImpl: typeof fetch;
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
  readonly input_schema: Readonly<Record<string, unknown>>;
  readonly name: string;
}

const API_VERSION = '2026-10-21';
const MAX_TOKENS = 16000;

const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const numberField = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): number => {
  const value = record[key];

  return typeof value === 'number' ? value : 0;
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

const toApiTool = (tool: Tool): HarnessTool => {
  return {
    description: tool.description ?? '',
    input_schema: tool.inputSchema,
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
): Readonly<Record<string, unknown>> {
  return {
    max_tokens: MAX_TOKENS,
    messages: [{ content: prompt, role: 'user' }],
    model: options.model,
    output_config: { effort: options.effort },
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

const parseUsage = (value: unknown): SelectionUsage => {
  const usage = isRecord(value) ? value : {};

  return {
    cacheReadInputTokens: numberField(usage, 'cache_read_input_tokens'),
    cacheWriteInputTokens: numberField(usage, 'cache_creation_input_tokens'),
    inputTokens: numberField(usage, 'input_tokens'),
    outputTokens: numberField(usage, 'output_tokens'),
  };
};

/**
 * @description Parses a Messages API response body into a {@link Selection}. Tool inputs arrive already parsed
 * as JSON objects; text blocks are concatenated for the report.
 * @public
 */
export function parseResponseBody(body: unknown): Selection {
  if (!isRecord(body) || !Array.isArray(body['content'])) {
    return { kind: 'error', message: 'malformed response: no content array' };
  }
  if (body['stop_reason'] === 'refusal') {
    return { kind: 'error', message: 'model refused' };
  }

  const blocks: readonly unknown[] = body['content'];
  const calls = blocks.flatMap((block): SelectedCall[] => {
    if (!isRecord(block) || block['type'] !== 'tool_use') return [];
    const name = block['name'];
    if (typeof name !== 'string') return [];
    return [{ input: block['input'], name }];
  });
  const text = blocks
    .flatMap((block): string[] => {
      if (!isRecord(block) || block['type'] !== 'text') return [];
      const blockText = block['text'];
      if (typeof blockText !== 'string') return [];
      return [blockText];
    })
    .join('\n');

  return { calls, kind: 'calls', text, usage: parseUsage(body['usage']) };
}

const isRetryable = (status: number): boolean => {
  return status === 429 || status >= 500;
};

const delay = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * @description Creates the selector. Retries 429/5xx with exponential backoff up to `maxRetries` times.
 * @public
 */
export function createAnthropicToolSelector(
  options: AnthropicToolSelectorOptions,
): ToolSelector {
  const send = async (body: string, attempt: number): Promise<Selection> => {
    const response = await options.fetchImpl(`${options.baseUrl}/v1/messages`, {
      body,
      headers: {
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
        'x-api-key': options.apiKey,
      },
      method: 'POST',
    });

    if (response.ok) {
      const json: unknown = await response.json();

      return parseResponseBody(json);
    }
    if (isRetryable(response.status) && attempt < options.maxRetries) {
      await delay(1000 * 2 ** attempt);

      return send(body, attempt + 1);
    }

    const detail = await response.text();

    return {
      kind: 'error',
      message: `HTTP ${response.status}: ${detail.slice(0, 300)}`,
    };
  };

  return {
    model: options.model,
    select: async (prompt: string): Promise<Selection> => {
      try {
        return await send(JSON.stringify(buildRequestBody(options, prompt)), 0);
      } catch (error: unknown) {
        return {
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
