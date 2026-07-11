/**
 * @description Hybrid MCP tool router for agents chat: deterministic rules plus a numeric confidence score; optional LLM refinement is feature-flagged in {@link AgentsMcpRouterLlmService}.
 */

import { Injectable } from '@nestjs/common';

/**
 * @description MCP tool names exposed by {@link McpDeveloperMcpSurface} that the router may select (single source of truth for rules, dispatch, and optional LLM fallback).
 */
export const AGENTS_MCP_ROUTED_TOOL_NAMES = [
  'get_activity_by_date',
  'get_document',
  'get_last_activity',
  'get_plan',
  'get_plan_output',
  'get_remaining_tasks_for_plan',
  'get_task',
  'get_tasks_by_plan_id',
  'health',
  'list_notes',
  'list_plans_by_status',
  'list_sources',
  'list_tasks_by_category',
  'semantic_search',
] as const;

/** MCP tool names exposed by {@link McpDeveloperMcpSurface} that the router may select. */
export type AgentsMcpRoutedToolName =
  (typeof AGENTS_MCP_ROUTED_TOOL_NAMES)[number];

/**
 * @description One routing decision: MCP tool name, JSON-serializable arguments for that tool, and confidence in [0, 1].
 */
export interface AgentsMcpRouteDecision {
  readonly args: Readonly<Record<string, unknown>>;
  readonly confidence: number;
  readonly reason: string;
  readonly tool: AgentsMcpRoutedToolName;
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * @description Collects UUIDs from `text` in order of appearance.
 */
const collectUuids = (text: string): readonly string[] => {
  const matches = text.match(UUID_RE);
  if (matches == null || matches.length === 0) {
    return [];
  }
  return matches.map((m) => m.toLowerCase());
};

const ISO_DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

/**
 * @description Infers list_plans_by_status statuses from natural language (uppercase for GraphQL filter layer).
 */
const inferStatusesFromMessage = (lower: string): readonly string[] | null => {
  if (/\b(pending|\/ot\/pending)\b/.test(lower)) {
    return ['PENDING'];
  }
  if (/\b(in[\s_-]*progress|inprogress)\b/.test(lower)) {
    return ['IN_PROGRESS'];
  }
  if (/\b(completed?|done\s+plans?)\b/.test(lower)) {
    return ['COMPLETED'];
  }
  if (/\bblocked\b/.test(lower) && /\bplan/.test(lower)) {
    return ['BLOCKED'];
  }
  return null;
};

/**
 * @description True when the message clearly concerns listing plans by status (avoids matching generic "pending work").
 */
const wantsListPlansByStatus = (lower: string): boolean => {
  if (inferStatusesFromMessage(lower) == null) {
    return false;
  }
  return (
    /\b(list|show|what|fetch|get|give)\b/.test(lower) &&
    /\b(plan|openthrottle|ot)\b/.test(lower)
  );
};

/**
 * @description Parses daysBack from phrases like "last 7 days" or "3 days ago".
 */
const parseDaysBack = (lower: string): number | null => {
  const lastDays = lower.match(/\b(?:last|past)\s+(\d{1,3})\s+days?\b/);
  if (lastDays?.[1] != null) {
    const n = Number.parseInt(lastDays[1], 10);
    if (n >= 1 && n <= 365) {
      return n;
    }
  }
  const daysAgo = lower.match(/\b(\d{1,3})\s+days?\s+ago\b/);
  if (daysAgo?.[1] != null) {
    const n = Number.parseInt(daysAgo[1], 10);
    if (n >= 1 && n <= 365) {
      return n;
    }
  }
  if (/\byesterday\b/.test(lower)) {
    return 1;
  }
  if (/\b(last|this)\s+week\b/.test(lower)) {
    return 7;
  }
  if (/\b(last|this)\s+month\b/.test(lower)) {
    return 30;
  }
  return null;
};

/**
 * @description Parses category for list_tasks_by_category.
 */
const parseTaskCategory = (lower: string): string | null => {
  const m = lower.match(
    /\b(?:category|cat)\s+["']?([a-z0-9][a-z0-9._-]{1,48})["']?\b/i,
  );
  if (m?.[1] != null) {
    return m[1].toLowerCase();
  }
  const byCat = lower.match(
    /\b(?:tasks?|task)\s+(?:in|with)\s+category\s+["']?([a-z0-9][a-z0-9._-]{1,48})["']?\b/i,
  );
  if (byCat?.[1] != null) {
    return byCat[1].toLowerCase();
  }
  return null;
};

@Injectable()
export class AgentsMcpRouter {
  /**
   * @description Routes a user message to an MCP tool name and arguments; uses a rule fast-path only (no LLM).
   */
  route(input: {
    readonly conversationId?: string | null;
    readonly message: string;
  }): AgentsMcpRouteDecision {
    const raw = input.message.trim();
    const lower = raw.toLowerCase();
    const uuids = collectUuids(raw);

    if (/^(health|ping)$/i.test(raw) || /^mcp\s+health$/i.test(raw)) {
      return {
        args: {},
        confidence: 0.98,
        reason: 'exact_health_ping',
        tool: 'health',
      };
    }

    if (
      /\blist[_\s]?sources\b/.test(lower) ||
      /\bknowledge[-\s]?base\s+sources\b/.test(lower) ||
      (/\bwhat\s+plans\b/.test(lower) &&
        /\b(in\s+)?(openthrottle|ot|kb)\b/.test(lower))
    ) {
      return {
        args: {},
        confidence: 0.93,
        reason: 'list_sources_keywords',
        tool: 'list_sources',
      };
    }

    if (
      /\blist[_\s]?notes\b/.test(lower) ||
      /\bshow\s+notes\b/.test(lower) ||
      /\bmy\s+notes\b/.test(lower)
    ) {
      return {
        args: {},
        confidence: 0.9,
        reason: 'list_notes_keywords',
        tool: 'list_notes',
      };
    }

    if (wantsListPlansByStatus(lower)) {
      const statuses = inferStatusesFromMessage(lower);
      if (statuses != null) {
        return {
          args: { statuses: [...statuses] },
          confidence: 0.88,
          reason: 'list_plans_by_status_heuristic',
          tool: 'list_plans_by_status',
        };
      }
    }

    const iso = raw.match(ISO_DATE_RE);
    const daysBack = parseDaysBack(lower);
    /** Require activity/shipped/commits or OpenThrottle wording so bare "last week" does not hit this tool. */
    const hasActivityIntent =
      /\bactivity\b/.test(lower) ||
      /\b(worked|shipped|ship)\b/.test(lower) ||
      /\bcommits?\b/.test(lower) ||
      /\bopenthrottle\b/.test(lower);

    if (hasActivityIntent && (iso?.[1] != null || daysBack != null)) {
      if (iso?.[1] != null) {
        return {
          args: { date: iso[1] },
          confidence: 0.86,
          reason: 'get_activity_by_date_iso',
          tool: 'get_activity_by_date',
        };
      }
      if (daysBack != null) {
        return {
          args: { daysBack },
          confidence: 0.84,
          reason: 'get_activity_by_date_days_back',
          tool: 'get_activity_by_date',
        };
      }
    }

    const firstUuid = uuids[0];
    const secondUuid = uuids[1];

    if (firstUuid != null) {
      if (
        /\blast\s+activity\b/.test(lower) ||
        /\bwhat\s+did\s+we\s+do\s+last\b/.test(lower)
      ) {
        const args: Record<string, unknown> = { planId: firstUuid };
        if (secondUuid != null && /\btask\b/.test(lower)) {
          args['taskId'] = secondUuid;
        }
        return {
          args,
          confidence:
            secondUuid != null && /\btask\b/.test(lower) ? 0.87 : 0.85,
          reason: 'get_last_activity_keywords',
          tool: 'get_last_activity',
        };
      }

      if (
        /\bplan\s+output\b/.test(lower) ||
        /\boutput\s+stream\b/.test(lower) ||
        /\bralph\s+output\b/.test(lower) ||
        /\biteration\s+log\b/.test(lower)
      ) {
        return {
          args: { planId: firstUuid },
          confidence: 0.9,
          reason: 'get_plan_output_keywords',
          tool: 'get_plan_output',
        };
      }

      if (
        /\bremaining\s+tasks\b/.test(lower) ||
        /\btasks\s+left\b/.test(lower) ||
        /\bopen\s+tasks\b/.test(lower) ||
        /\bwhat\s+tasks\s+remain\b/.test(lower)
      ) {
        return {
          args: { planId: firstUuid },
          confidence: 0.91,
          reason: 'get_remaining_tasks_for_plan_keywords',
          tool: 'get_remaining_tasks_for_plan',
        };
      }

      if (
        /\btasks?\s+for\s+(?:plan\s+)?/i.test(raw) ||
        /\ball\s+tasks\b/.test(lower) ||
        /\blist\s+tasks\b/.test(lower) ||
        /\btasks\s+by\s+plan\b/.test(lower)
      ) {
        if (!/\bremaining\b/.test(lower)) {
          return {
            args: { planId: firstUuid },
            confidence: 0.88,
            reason: 'get_tasks_by_plan_id_keywords',
            tool: 'get_tasks_by_plan_id',
          };
        }
      }

      if (
        /\bget\s+document\b/.test(lower) ||
        /\bfetch\s+chunk\b/.test(lower) ||
        /\bchunk\s+content\b/.test(lower) ||
        (/\bdocument\b/.test(lower) && /\b(uuid|id)\b/.test(lower))
      ) {
        return {
          args: { id: firstUuid },
          confidence: 0.89,
          reason: 'get_document_keywords',
          tool: 'get_document',
        };
      }

      if (
        /\bget\s+task\b/.test(lower) ||
        /\btask\s+details\b/.test(lower) ||
        (/\btask\b/.test(lower) && !/\bplan\b/.test(lower) && raw.length < 160)
      ) {
        return {
          args: { id: firstUuid },
          confidence: 0.87,
          reason: 'get_task_keywords',
          tool: 'get_task',
        };
      }

      if (
        /\bget\s+plan\b/.test(lower) ||
        /\bplan\s+details\b/.test(lower) ||
        (/\bplan\b/.test(lower) &&
          !/\btasks?\b/.test(lower) &&
          !/\bremaining\b/.test(lower) &&
          raw.length < 200)
      ) {
        return {
          args: { id: firstUuid },
          confidence: 0.86,
          reason: 'get_plan_keywords',
          tool: 'get_plan',
        };
      }

      const stripped = raw.replace(UUID_RE, '').replace(/[\s,.;:!?-]+/g, '');
      if (stripped.length <= 2 && uuids.length >= 1) {
        return {
          args: { id: firstUuid },
          confidence: 0.74,
          reason: 'bare_uuid_defaults_to_get_plan',
          tool: 'get_plan',
        };
      }
    }

    const taskCategory = parseTaskCategory(lower);
    if (
      taskCategory != null &&
      (/\blist\s+tasks\b/.test(lower) ||
        /\btasks\s+by\s+category\b/.test(lower) ||
        /\blist_tasks_by_category\b/.test(lower))
    ) {
      const args: Record<string, unknown> = { category: taskCategory };
      const planUuid = uuids[0];
      if (planUuid != null) {
        args['planId'] = planUuid;
      }
      return {
        args,
        confidence: planUuid != null ? 0.86 : 0.82,
        reason: 'list_tasks_by_category_parsed',
        tool: 'list_tasks_by_category',
      };
    }

    return {
      args: { query: raw },
      confidence: 0.38,
      reason: 'default_semantic_search',
      tool: 'semantic_search',
    };
  }
}
