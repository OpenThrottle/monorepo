/**
 * @description Which MCP tools only read. Used in public mode to answer a read-only OAuth
 * token with HTTP 403 `insufficient_scope` before a write tool runs, so clients can step up
 * (design: docs/openthrottle/mcp-oauth-design.md § Scopes and RBAC).
 *
 * **A tool not listed here is treated as a write**, so forgetting to classify a new tool
 * fails closed. The server enforces the same rule independently (read-only tokens cannot
 * run GraphQL mutations), so this list is UX, not the security boundary.
 */

const READ_ONLY_TOOL_NAMES: ReadonlySet<string> = new Set([
  'agent_conversation_get',
  'agent_conversation_get_messages',
  'agent_conversation_list',
  'auth_status',
  'code_search',
  'discover_agent_clis',
  'discover_local_models',
  'get_activity_by_date',
  'get_blog_post',
  'get_document',
  'get_last_activity',
  'get_note',
  'get_plan',
  'get_plan_output',
  'get_plan_runs',
  'get_project',
  'get_project_plans',
  'get_remaining_tasks_for_plan',
  'get_skill_availability',
  'get_skill_availability_rule_set',
  'get_task',
  'get_tasks_by_plan_id',
  'get_work_sessions',
  'health',
  'list_blog_authors',
  'list_blog_posts',
  'list_blog_tags',
  'list_notes',
  'list_plans_by_status',
  'list_projects',
  'list_rule_applications',
  'list_scheduled_jobs',
  'list_skill_tags',
  'list_sources',
  'list_tag_action_rules',
  'list_tasks_by_category',
  'semantic_search',
]);

/**
 * @description The read-only tool names, for tests that keep the list in step with the surface.
 * @public
 */
export const getReadOnlyToolNames = (): readonly string[] => {
  return [...READ_ONLY_TOOL_NAMES];
};

/**
 * @description Whether a tool only reads. Unknown names are writes.
 * @public
 */
export const isReadOnlyTool = (name: string): boolean => {
  return READ_ONLY_TOOL_NAMES.has(name);
};
