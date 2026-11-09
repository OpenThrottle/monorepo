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
