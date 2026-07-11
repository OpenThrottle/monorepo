import type { AgentsMcpRoutedToolName } from './agents-mcp-router';

/**
 * @description Eval / regression cases aligned with the MCP intent matrix (search, plans, tasks, activity, notes, health). Exercised by `agents-mcp-router.golden-prompts.test.ts`.
 */
export interface AgentsMcpRouterGoldenPrompt {
  readonly expectedArgs: Readonly<Record<string, unknown>>;
  readonly expectedTool: AgentsMcpRoutedToolName;
  /** Short label for failures (stable, no punctuation). */
  readonly id: string;
  readonly intent: string;
  readonly message: string;
}

const PLAN = '18e1ca8f-8ba5-483c-bb59-4e89f95ccfe0';
const TASK = 'f337a3a2-43d6-4d31-beea-89f05489f482';
const CHUNK = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

/**
 * @description Golden prompts: expected tool + args after {@link AgentsMcpRouter.route}.
 */
export const AGENTS_MCP_ROUTER_GOLDEN_PROMPTS: readonly AgentsMcpRouterGoldenPrompt[] =
  [
    {
      expectedArgs: {},
      expectedTool: 'health',
      id: 'health_exact',
      intent: 'health',
      message: 'health',
    },
    {
      expectedArgs: {},
      expectedTool: 'list_notes',
      id: 'notes_list',
      intent: 'notes',
      message: 'list_notes from my workspace',
    },
    {
      expectedArgs: {},
      expectedTool: 'list_sources',
      id: 'sources_kb',
      intent: 'plans_inventory',
      message: 'What plans are in the openthrottle kb?',
    },
    {
      expectedArgs: { statuses: ['BLOCKED'] },
      expectedTool: 'list_plans_by_status',
      id: 'plans_blocked',
      intent: 'plans_by_status',
      message: 'Get blocked plan list from openthrottle',
    },
    {
      expectedArgs: { statuses: ['COMPLETED'] },
      expectedTool: 'list_plans_by_status',
      id: 'plans_done',
      intent: 'plans_by_status',
      message: 'Fetch done plans in OT',
    },
    {
      expectedArgs: { statuses: ['IN_PROGRESS'] },
      expectedTool: 'list_plans_by_status',
      id: 'plans_in_progress',
      intent: 'plans_by_status',
      message: 'Show in progress openthrottle plans',
    },
    {
      expectedArgs: { statuses: ['PENDING'] },
      expectedTool: 'list_plans_by_status',
      id: 'plans_pending_ot',
      intent: 'plans_by_status',
      message: 'List pending plans in OT',
    },
    {
      expectedArgs: { daysBack: 7 },
      expectedTool: 'get_activity_by_date',
      id: 'activity_days_openthrottle',
      intent: 'activity',
      message: 'Show openthrottle activity for the last 7 days',
    },
    {
      expectedArgs: { date: '2026-05-15' },
      expectedTool: 'get_activity_by_date',
      id: 'activity_iso_commits',
      intent: 'activity',
      message: 'Commits and activity on 2026-05-15',
    },
    {
      expectedArgs: { daysBack: 1 },
      expectedTool: 'get_activity_by_date',
      id: 'activity_yesterday_shipped',
      intent: 'activity',
      message: 'What shipped yesterday in openthrottle?',
    },
    {
      expectedArgs: { planId: PLAN },
      expectedTool: 'get_last_activity',
      id: 'last_activity_plan',
      intent: 'activity',
      message: `Last activity for ${PLAN}`,
    },
    {
      expectedArgs: { planId: PLAN, taskId: TASK },
      expectedTool: 'get_last_activity',
      id: 'last_activity_plan_task',
      intent: 'activity',
      message: `Last activity for plan ${PLAN} task ${TASK}`,
    },
    {
      expectedArgs: { planId: PLAN },
      expectedTool: 'get_plan_output',
      id: 'plan_output_stream',
      intent: 'plans_read',
      message: `Ralph output for ${PLAN}`,
    },
    {
      expectedArgs: { planId: PLAN },
      expectedTool: 'get_remaining_tasks_for_plan',
      id: 'remaining_tasks',
      intent: 'tasks_read',
      message: `What tasks remain for plan ${PLAN}?`,
    },
    {
      expectedArgs: { planId: PLAN },
      expectedTool: 'get_tasks_by_plan_id',
      id: 'all_tasks_plan',
      intent: 'tasks_read',
      message: `List all tasks for ${PLAN}`,
    },
    {
      expectedArgs: { category: 'infra' },
      expectedTool: 'list_tasks_by_category',
      id: 'tasks_by_category',
      intent: 'tasks_read',
      message: 'List tasks by category infra',
    },
    {
      expectedArgs: { category: 'infra', planId: PLAN },
      expectedTool: 'list_tasks_by_category',
      id: 'tasks_by_category_plan',
      intent: 'tasks_read',
      message: `list_tasks_by_category for category infra ${PLAN}`,
    },
    {
      expectedArgs: { id: CHUNK },
      expectedTool: 'get_document',
      id: 'search_chunk_content',
      intent: 'search_chunk',
      message: `Fetch chunk content ${CHUNK}`,
    },
    {
      expectedArgs: { id: PLAN },
      expectedTool: 'get_plan',
      id: 'get_plan',
      intent: 'plans_read',
      message: `get plan ${PLAN}`,
    },
    {
      expectedArgs: { id: PLAN },
      expectedTool: 'get_plan',
      id: 'get_plan',
      intent: 'plans_read',
      message: PLAN,
    },
    {
      expectedArgs: { id: TASK },
      expectedTool: 'get_task',
      id: 'get_task',
      intent: 'tasks_read',
      message: `get task ${TASK}`,
    },
    {
      expectedArgs: {
        query: 'How do we model auth for the public GraphQL API?',
      },
      expectedTool: 'semantic_search',
      id: 'semantic_open_ended',
      intent: 'search',
      message: 'How do we model auth for the public GraphQL API?',
    },
  ];
