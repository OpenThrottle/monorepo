/** @description The per-owner caps and approval switch, resolved from the environment. */
export interface ScheduledAgentJobLimits {
  readonly maxMcpPerOwner: number;
  readonly maxPerOwner: number;
  readonly mcpRequireApproval: boolean;
}
