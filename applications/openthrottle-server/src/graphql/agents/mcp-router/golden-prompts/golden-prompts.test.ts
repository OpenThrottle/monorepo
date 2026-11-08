import { describe, expect, it } from 'vitest';

import { AgentsMcpRouter } from '../mcp-router.service.ts';
import { AGENTS_MCP_ROUTER_GOLDEN_PROMPTS } from './golden-prompts.constants.ts';

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
