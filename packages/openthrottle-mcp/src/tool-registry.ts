/**
 * @description Single source of truth for the developer MCP tool surface. Both the stdio `runServerLocal` path and the Nest `McpDeveloperMcpSurface` are registered from (and validated against) this array, so a tool added once is exposed to every consumer. The parity test in `tool-registry.test.ts` asserts the Nest surface's `@Tool` decorators reference the exact same name/parameters entries.
 *
 * Validation note: every dispatch path validates `arguments` against the tool's
 * `parameters` schema *before* the handler runs — the MCP SDK's `validateToolInput`
 * (stdio, `@modelcontextprotocol/sdk`) and `@rekog/mcp-nest`'s `McpToolsHandler`
 * (Nest) both `safeParse` and reject invalid input first. The redundant-looking
 * `schema.safeParse(args)` at the top of each handler in `src/tools/*` is therefore
 * NOT for the dispatch path; it is the guard for direct, in-process invocation —
 * the handlers are exported standalone functions and are unit-tested by calling
 * them with invalid args (e.g. `tasks.test.ts` asserts the "Invalid arguments…"
 * result). Keeping it preserves that standalone contract; do not remove it on the
 * assumption the framework already validated.
 */

import type {
  McpServer,
  ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  AnySchema,
  ZodRawShapeCompat,
} from '@modelcontextprotocol/sdk/server/zod-compat.js';
import * as Th from './nest-tool-handlers.ts';

/**
 * @description The schema types `McpServer.registerTool` accepts for `inputSchema` — a zod v3 or v4 schema, or a raw shape. The codegen-derived `*ToolParameters` mix zod v3 and v4, so the registry mirrors the SDK's own compat union to stay version-agnostic.
 */
type RegisterToolInputSchema = AnySchema | ZodRawShapeCompat;

/**
 * @description One canonical tool entry. `parameters` is exposed (erased to `unknown`) so the parity test can assert reference identity against the Nest surface's `@Tool` schema; `register` carries the fully-typed schema + handler so a single call site registers it on an `McpServer`.
 */
export type DeveloperMcpToolDefinition = {
  description: string;
  name: string;
  parameters: unknown;
  register: (server: McpServer) => void;
};

/**
 * @description Captures a tool's name, description, parameter schema, and matching handler as one canonical entry. `Params` is inferred from the positional `parameters` argument, then flows into the `handler` type (`ToolCallback<Params>`) and `server.registerTool`, so a parameter/handler mismatch fails to type-check — no `as` casts required. Positional (not a single object literal) so inference resolves `Params` from the schema before checking the handler.
 */
const defineTool = <Params extends RegisterToolInputSchema>(
  name: string,
  description: string,
  parameters: Params,
  handler: ToolCallback<Params>,
): DeveloperMcpToolDefinition => ({
  description,
  name,
  parameters,
  register: (server) =>
    server.registerTool(
      name,
      { description, inputSchema: parameters },
      handler,
    ),
});

/**
 * @description The canonical developer MCP tool list. Add a tool here once; `registerDeveloperMcpTools` exposes it on the stdio server and the parity test forces `McpDeveloperMcpSurface` to mirror it.
 */
export const developerMcpToolDefinitions: readonly DeveloperMcpToolDefinition[] =
  [
    defineTool(
      'append_plan_output',
      Th.appendPlanOutputToolDescription,
      Th.appendPlanOutputToolParameters,
      Th.appendPlanOutputToolHandler,
    ),
    defineTool(
      'agent_conversation_get',
      Th.getAgentConversationToolDescription,
      Th.getAgentConversationToolParameters,
      Th.getAgentConversationToolHandler,
    ),
    defineTool(
      'agent_conversation_get_messages',
      Th.getAgentConversationMessagesToolDescription,
      Th.getAgentConversationMessagesToolParameters,
      Th.getAgentConversationMessagesToolHandler,
    ),
    defineTool(
      'agent_conversation_list',
      Th.listAgentConversationsToolDescription,
      Th.listAgentConversationsToolParameters,
      Th.listAgentConversationsToolHandler,
    ),
    defineTool(
      'create_note',
      Th.createNoteToolDescription,
      Th.createNoteToolParameters,
      Th.createNoteToolHandler,
    ),
    defineTool(
      'create_plan',
      Th.createPlanToolDescription,
      Th.createPlanToolParameters,
      Th.createPlanToolHandler,
    ),
    defineTool(
      'create_plans',
      Th.createPlansToolDescription,
      Th.createPlansToolParameters,
      Th.createPlansToolHandler,
    ),
    defineTool(
      'create_task',
      Th.createTaskToolDescription,
      Th.createTaskToolParameters,
      Th.createTaskToolHandler,
    ),
    defineTool(
      'create_tasks',
      Th.createTasksToolDescription,
      Th.createTasksToolParameters,
      Th.createTasksToolHandler,
    ),
    defineTool(
      'delete_note',
      Th.deleteNoteToolDescription,
      Th.deleteNoteToolParameters,
      Th.deleteNoteToolHandler,
    ),
    defineTool(
      'delete_plan',
      Th.deletePlanToolDescription,
      Th.deletePlanToolParameters,
      Th.deletePlanToolHandler,
    ),
    defineTool(
      'delete_project',
      Th.deleteProjectToolDescription,
      Th.deleteProjectToolParameters,
      Th.deleteProjectToolHandler,
    ),
    defineTool(
      'delete_task',
      Th.deleteTaskToolDescription,
      Th.deleteTaskToolParameters,
      Th.deleteTaskToolHandler,
    ),
    defineTool(
      'discover_local_models',
      Th.discoverLocalModelsToolDescription,
      Th.discoverLocalModelsToolParameters,
      Th.discoverLocalModelsToolHandler,
    ),
    defineTool(
      'get_activity_by_date',
      Th.getActivityByDateToolDescription,
      Th.getActivityByDateToolParameters,
      Th.getActivityByDateToolHandler,
    ),
    defineTool(
      'get_document',
      Th.getDocumentToolDescription,
      Th.getDocumentToolParameters,
      Th.getDocumentToolHandler,
    ),
    defineTool(
      'get_last_activity',
      Th.getLastActivityToolDescription,
      Th.getLastActivityToolParameters,
      Th.getLastActivityToolHandler,
    ),
    defineTool(
      'get_note',
      Th.getNoteToolDescription,
      Th.getNoteToolParameters,
      Th.getNoteToolHandler,
    ),
    defineTool(
      'get_plan',
      Th.getPlanToolDescription,
      Th.getPlanToolParameters,
      Th.getPlanToolHandler,
    ),
    defineTool(
      'get_plan_output',
      Th.getPlanOutputToolDescription,
      Th.getPlanOutputToolParameters,
      Th.getPlanOutputToolHandler,
    ),
    defineTool(
      'get_remaining_tasks_for_plan',
      Th.getRemainingTasksForPlanToolDescription,
      Th.getRemainingTasksForPlanToolParameters,
      Th.getRemainingTasksForPlanToolHandler,
    ),
    defineTool(
      'get_task',
      Th.getTaskToolDescription,
      Th.getTaskToolParameters,
      Th.getTaskToolHandler,
    ),
    defineTool(
      'get_tasks_by_plan_id',
      Th.getTasksByPlanIdToolDescription,
      Th.getTasksByPlanIdToolParameters,
      Th.getTasksByPlanIdToolHandler,
    ),
    defineTool(
      'health',
      Th.healthToolDescription,
      Th.healthToolParameters,
      Th.healthToolHandler,
    ),
    defineTool(
      'link_commit',
      Th.linkCommitToolDescription,
      Th.linkCommitToolParameters,
      Th.linkCommitToolHandler,
    ),
    defineTool(
      'list_notes',
      Th.listNotesToolDescription,
      Th.listNotesToolParameters,
      Th.listNotesToolHandler,
    ),
    defineTool(
      'list_plans_by_status',
      Th.listPlansByStatusToolDescription,
      Th.listPlansByStatusToolParameters,
      Th.listPlansByStatusToolHandler,
    ),
    defineTool(
      'list_sources',
      Th.listSourcesToolDescription,
      Th.listSourcesToolParameters,
      Th.listSourcesToolHandler,
    ),
    defineTool(
      'list_tasks_by_category',
      Th.listTasksByCategoryToolDescription,
      Th.listTasksByCategoryToolParameters,
      Th.listTasksByCategoryToolHandler,
    ),
    defineTool(
      'reorder_plan_tasks',
      Th.reorderPlanTasksToolDescription,
      Th.reorderPlanTasksToolParameters,
      Th.reorderPlanTasksToolHandler,
    ),
    defineTool(
      'list_skill_tags',
      Th.listSkillTagsToolDescription,
      Th.listSkillTagsToolParameters,
      Th.listSkillTagsToolHandler,
    ),
    defineTool(
      'add_skill_tag',
      Th.addSkillTagToolDescription,
      Th.addSkillTagToolParameters,
      Th.addSkillTagToolHandler,
    ),
    defineTool(
      'rename_skill_tag',
      Th.renameSkillTagToolDescription,
      Th.renameSkillTagToolParameters,
      Th.renameSkillTagToolHandler,
    ),
    defineTool(
      'remove_skill_tag',
      Th.removeSkillTagToolDescription,
      Th.removeSkillTagToolParameters,
      Th.removeSkillTagToolHandler,
    ),
    defineTool(
      'get_skill_availability_rule_set',
      Th.getSkillAvailabilityRuleSetToolDescription,
      Th.getSkillAvailabilityRuleSetToolParameters,
      Th.getSkillAvailabilityRuleSetToolHandler,
    ),
    defineTool(
      'upsert_skill_availability_rule_set',
      Th.upsertSkillAvailabilityRuleSetToolDescription,
      Th.upsertSkillAvailabilityRuleSetToolParameters,
      Th.upsertSkillAvailabilityRuleSetToolHandler,
    ),
    defineTool(
      'delete_skill_availability_rule_set',
      Th.deleteSkillAvailabilityRuleSetToolDescription,
      Th.deleteSkillAvailabilityRuleSetToolParameters,
      Th.deleteSkillAvailabilityRuleSetToolHandler,
    ),
    defineTool(
      'add_skill_availability_rule',
      Th.addSkillAvailabilityRuleToolDescription,
      Th.addSkillAvailabilityRuleToolParameters,
      Th.addSkillAvailabilityRuleToolHandler,
    ),
    defineTool(
      'update_skill_availability_rule',
      Th.updateSkillAvailabilityRuleToolDescription,
      Th.updateSkillAvailabilityRuleToolParameters,
      Th.updateSkillAvailabilityRuleToolHandler,
    ),
    defineTool(
      'remove_skill_availability_rule',
      Th.removeSkillAvailabilityRuleToolDescription,
      Th.removeSkillAvailabilityRuleToolParameters,
      Th.removeSkillAvailabilityRuleToolHandler,
    ),
    defineTool(
      'semantic_search',
      Th.semanticSearchToolDescription,
      Th.semanticSearchToolParameters,
      Th.semanticSearchToolHandler,
    ),
    defineTool(
      'update_note',
      Th.updateNoteToolDescription,
      Th.updateNoteToolParameters,
      Th.updateNoteToolHandler,
    ),
    defineTool(
      'update_plan',
      Th.updatePlanToolDescription,
      Th.updatePlanToolParameters,
      Th.updatePlanToolHandler,
    ),
    defineTool(
      'update_task',
      Th.updateTaskToolDescription,
      Th.updateTaskToolParameters,
      Th.updateTaskToolHandler,
    ),
  ];

/**
 * @description Registers every canonical tool from {@link developerMcpToolDefinitions} on an `McpServer`. Used by the stdio `runServerLocal` entrypoint so it stays in lockstep with the Nest surface.
 */
export function registerDeveloperMcpTools(server: McpServer): void {
  for (const tool of developerMcpToolDefinitions) {
    tool.register(server);
  }
}
