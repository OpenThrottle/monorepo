import { describe, expect, it } from 'vitest';
import { AGENTS_MCP_ROUTER_GOLDEN_PROMPTS } from './agents-mcp-router.golden-prompts';
import { AgentsMcpRouter } from './agents-mcp-router';

describe('AgentsMcpRouter golden prompts', () => {
  const router = new AgentsMcpRouter();

  it.each(AGENTS_MCP_ROUTER_GOLDEN_PROMPTS)(
    '$id ($intent): routes to $expectedTool',
    (golden) => {
      const decision = router.route({ message: golden.message });
      expect(decision.tool, golden.id).toBe(golden.expectedTool);
      expect(decision.args, golden.id).toEqual(golden.expectedArgs);
    },
  );
});
