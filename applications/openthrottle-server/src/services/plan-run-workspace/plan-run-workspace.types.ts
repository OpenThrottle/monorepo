import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import type { loadPlanRunConfig } from '@openthrottle/openthrottle-agentic-loop';
import type {
  AgentConfigTrust,
  WorkflowCorrelation,
} from '@openthrottle/openthrottle-agentic-utils';

import type { RunPlanOrchestratorJobData } from '../../queues/plans/plans.types.ts';
import type { ProvisionedPlanRunWorktree } from '../plan-run-worktree-provision/plan-run-worktree-provision.types.ts';

/** @description The repo's the `defaults` block of `.openthrottle/ot-loop.json` (merged with env) as `loadPlanRunConfig` returns it. */
export type PlanRunWorkspaceConfig = ReturnType<typeof loadPlanRunConfig>;

/**
 * @description Inputs to {@link PlanRunWorkspaceService.prepare}. The OT Loop runner passes the
 * job payload and correlation plus the `skipMcpPreflight` flag.
 */
export interface PreparePlanRunWorkspaceParams {
  readonly correlation: WorkflowCorrelation | undefined;
  readonly jobData: RunPlanOrchestratorJobData;
  /**
   * Called once, before the agent starts, when the run was provisioned into its own worktree, never
   * when it opted out and works in the base checkout.
   */
  readonly onWorktreeProvisioned:
    ((worktree: ProvisionedPlanRunWorktree) => void) | undefined;
  /** True skips the MCP/.env preflight (the OT Loop worker uses no MCP). */
  readonly skipMcpPreflight: boolean;
}

/** @description What a run needs once its workspace is ready. */
export interface PreparedPlanRunWorkspace {
  /**
   * Whether the agent may load the checkout's own agent config, resolved from the BASE checkout's
   * trust flag (a provisioned worktree inherits its parent's trust). Runners turn it into a driver
   * posture with {@link PlanRunWorkspaceService.buildRepoAgentConfig}.
   */
  readonly agentConfigTrust: AgentConfigTrust;
  /** The repo's workflow config, with the OT root applied to the process env. */
  readonly config: PlanRunWorkspaceConfig;
  /**
   * Names of OT skills materialized into the run's directory; empty when the checkout is not
   * foreign, its base checkout is not opted in, or injection failed.
   */
  readonly injectedSkillNames: readonly string[];
  /** The `plan_runs` row resolved from the correlation, or null when unresolved. */
  readonly run: PlanRun | null;
  /** The directory the agent runs in: the provisioned worktree, else the base checkout. */
  readonly workingDirectory: string;
}
