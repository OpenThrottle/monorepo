/**
 * @description Parses JSON routing decisions from the optional LLM intent classifier for {@link AgentsMcpRouterLlmService}.
 */

import { z } from 'zod';
import type { AgentsMcpRouteDecision } from './agents-mcp-router';
import { AGENTS_MCP_ROUTED_TOOL_NAMES } from './agents-mcp-router';

const ROUTING_TOOL_ENUM = AGENTS_MCP_ROUTED_TOOL_NAMES as unknown as [
  string,
  ...string[],
];

const LlmRoutingSchema = z.object({
  args: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(512),
  tool: z.enum(ROUTING_TOOL_ENUM),
});

/**
 * @description Strips optional ```json fences``` from model output before JSON.parse.
 */
const stripMarkdownJsonFence = (raw: string): string => {
  const t = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/im.exec(t);

  if (fenced?.[1] != null) {
    return fenced[1].trim();
  }

  return t;
};

/**
 * @description Coerces LangChain message content to a single string for JSON parsing.
 */
export const messageContentToString = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (
          part != null &&
          typeof part === 'object' &&
          'type' in part &&
          (part as { readonly type?: string }).type === 'text' &&
          'text' in part
        ) {
          return String((part as { readonly text: string }).text);
        }

        return '';
      })
      .join('');
  }

  return String(content ?? '');
};

/**
 * @description System prompt for one-shot structured routing (tool + args + confidence).
 */
export const buildAgentsMcpLlmRoutingSystemPrompt = (): string => {
  const tools = AGENTS_MCP_ROUTED_TOOL_NAMES.join(', ');

  return [
    'You route user messages to exactly one OpenThrottle MCP developer tool.',
    `Reply with ONLY a single JSON object (no prose). Keys: tool (string, one of: ${tools}), args (object, tool-specific), confidence (number 0–1), reason (short string).`,
    'Arg shapes (omit keys the tool does not need; use empty object {} when no args):',
    '- get_activity_by_date: { date?: "YYYY-MM-DD", daysBack?: number 1–365 }',
    '- get_document: { id: "<uuid>" }',
    '- get_last_activity: { planId: "<uuid>", taskId?: "<uuid>" }',
    '- get_plan: { id: "<uuid>" }',
    '- get_plan_output: { planId: "<uuid>" }',
    '- get_remaining_tasks_for_plan: { planId: "<uuid>" }',
    '- get_task: { id: "<uuid>" }',
    '- get_tasks_by_plan_id: { planId: "<uuid>" }',
    '- health: {}',
    '- list_notes: {}',
    '- list_plans_by_status: { statuses: ["PENDING"|"IN_PROGRESS"|"COMPLETED"|"BLOCKED", ...], limit?, offset?, ... }',
    '- list_sources: {}',
    '- list_tasks_by_category: { category: string, planId?: "<uuid>", limit?, status? }',
    '- semantic_search: { query: string, limit?: number }',
    'Prefer specific tools over semantic_search when the user clearly wants plans, tasks, health, listings, or UUID-scoped reads.',
  ].join('\n');
};

/**
 * @description Parses and validates LLM JSON into an {@link AgentsMcpRouteDecision}, or null when invalid.
 */
export const parseAgentsMcpLlmRoutingJson = (
  raw: string,
): AgentsMcpRouteDecision | null => {
  const text = stripMarkdownJsonFence(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return null;
  }

  const result = LlmRoutingSchema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  const d = result.data;

  return {
    args: d.args ?? {},
    confidence: d.confidence,
    reason: d.reason,
    tool: d.tool as AgentsMcpRouteDecision['tool'],
  };
};
