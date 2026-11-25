import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Shared plumbing for the agent-safety rules (`mcp-tool-registration`,
 * `agent-cli-spawn-chokepoint`, `disable-requires-reason`). See
 * docs/monorepo/code-style.md, "Agent-safety rules".
 */

export const createAgentSafetyRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#agent-safety-rules',
);
