import { describe, expect, it } from 'vitest';

import { resolveScheduledAgentJobLimits } from './scheduled-agent-jobs.utils.ts';

describe('resolveScheduledAgentJobLimits', () => {
  it('defaults to 25 jobs, 10 agent-created, no approval', () => {
    expect(resolveScheduledAgentJobLimits({})).toEqual({
      maxMcpPerOwner: 10,
      maxPerOwner: 25,
      mcpRequireApproval: false,
    });
  });

  it('reads the cap from the environment', () => {
    expect(
      resolveScheduledAgentJobLimits({
        SCHEDULED_AGENT_JOBS_MAX_PER_OWNER: '40',
      }).maxPerOwner,
    ).toBe(40);
  });

  it.each(['0', '-3', 'many', ''])('falls back to 25 for %j', (raw) => {
    expect(
      resolveScheduledAgentJobLimits({
        SCHEDULED_AGENT_JOBS_MAX_PER_OWNER: raw,
      }).maxPerOwner,
    ).toBe(25);
  });

  it('turns approval on only for true', () => {
    const on = resolveScheduledAgentJobLimits({
      SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL: 'TRUE',
    });
    const off = resolveScheduledAgentJobLimits({
      SCHEDULED_AGENT_JOBS_MCP_REQUIRE_APPROVAL: '1',
    });

    expect([on.mcpRequireApproval, off.mcpRequireApproval]).toEqual([
      true,
      false,
    ]);
  });
});
