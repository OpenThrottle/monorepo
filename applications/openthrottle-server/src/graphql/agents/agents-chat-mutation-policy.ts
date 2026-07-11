/**
 * @description Opt-in policy for routed write tools in agents chat (`AGENTS_CHAT_ALLOW_MUTATIONS`).
 */

import type { ConfigService } from '@nestjs/config';
import type { AgentsMcpRoutedToolName } from './agents-mcp-router';

/**
 * @description Routed MCP tools that mutate OpenThrottle data; blocked in agents chat unless {@link readAgentsChatMutationsEnabledFromConfig} is true. Extend when write routes are added to {@link AgentsMcpRouter}.
 */
const AGENTS_CHAT_MUTATION_ROUTED_TOOLS: readonly AgentsMcpRoutedToolName[] =
  [];

/**
 * @description True when `tool` is listed in {@link AGENTS_CHAT_MUTATION_ROUTED_TOOLS}.
 */
export const isAgentsChatMutationRoutedTool = (
  tool: AgentsMcpRoutedToolName,
): boolean => AGENTS_CHAT_MUTATION_ROUTED_TOOLS.includes(tool);

/**
 * @description Reads `AGENTS_CHAT_ALLOW_MUTATIONS` (opt-in for future routed write tools).
 */
export const readAgentsChatMutationsEnabledFromConfig = (
  config: ConfigService,
): boolean => {
  const v = config
    .get<string>('AGENTS_CHAT_ALLOW_MUTATIONS')
    ?.trim()
    .toLowerCase();

  return v === 'true' || v === '1' || v === 'yes';
};
