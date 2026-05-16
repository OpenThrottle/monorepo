/**
 * @description Dispatches a routed agents MCP decision to {@link McpDeveloperMcpSurface} methods (GraphQL-only handlers).
 */

import type { McpDeveloperMcpSurface } from '@openthrottle/nestjs-mcp-developer';
import type { AgentsMcpToolHandlerResult } from './agents-mcp-chat.mapper';
import type { AgentsMcpRouteDecision } from './agents-mcp-router';

/**
 * @description Invokes the MCP surface method for {@link AgentsMcpRouteDecision.tool} with router-produced args.
 */
export async function dispatchAgentsMcpRoutedTool(
  surface: McpDeveloperMcpSurface,
  decision: AgentsMcpRouteDecision,
): Promise<AgentsMcpToolHandlerResult> {
  const { args, tool } = decision;

  switch (tool) {
    case 'get_activity_by_date':
      return surface.getActivityByDate(
        args as Parameters<McpDeveloperMcpSurface['getActivityByDate']>[0],
      );
    case 'get_document':
      return surface.getDocument(
        args as Parameters<McpDeveloperMcpSurface['getDocument']>[0],
      );
    case 'get_last_activity':
      return surface.getLastActivity(
        args as Parameters<McpDeveloperMcpSurface['getLastActivity']>[0],
      );
    case 'get_plan':
      return surface.getPlan(
        args as Parameters<McpDeveloperMcpSurface['getPlan']>[0],
      );
    case 'get_plan_output':
      return surface.getPlanOutput(
        args as Parameters<McpDeveloperMcpSurface['getPlanOutput']>[0],
      );
    case 'get_remaining_tasks_for_plan':
      return surface.getRemainingTasksForPlan(
        args as Parameters<
          McpDeveloperMcpSurface['getRemainingTasksForPlan']
        >[0],
      );
    case 'get_task':
      return surface.getTask(
        args as Parameters<McpDeveloperMcpSurface['getTask']>[0],
      );
    case 'get_tasks_by_plan_id':
      return surface.getTasksByPlanId(
        args as Parameters<McpDeveloperMcpSurface['getTasksByPlanId']>[0],
      );
    case 'health':
      return surface.health(
        args as Parameters<McpDeveloperMcpSurface['health']>[0],
      );
    case 'list_notes':
      return surface.listNotes(
        args as Parameters<McpDeveloperMcpSurface['listNotes']>[0],
      );
    case 'list_plans_by_status':
      return surface.listPlansByStatus(
        args as Parameters<McpDeveloperMcpSurface['listPlansByStatus']>[0],
      );
    case 'list_sources':
      return surface.listSources(
        args as Parameters<McpDeveloperMcpSurface['listSources']>[0],
      );
    case 'list_tasks_by_category':
      return surface.listTasksByCategory(
        args as Parameters<McpDeveloperMcpSurface['listTasksByCategory']>[0],
      );
    case 'semantic_search':
      return surface.semanticSearch(
        args as Parameters<McpDeveloperMcpSurface['semanticSearch']>[0],
      );
    default: {
      const _exhaustive: never = tool;
      return _exhaustive;
    }
  }
}
