import type { AgentsMcpRoutedToolName } from '../mcp-router.types.ts';

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
