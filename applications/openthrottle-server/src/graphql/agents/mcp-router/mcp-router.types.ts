import type { AGENTS_MCP_ROUTED_TOOL_NAMES } from './mcp-router.constants.ts';
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
