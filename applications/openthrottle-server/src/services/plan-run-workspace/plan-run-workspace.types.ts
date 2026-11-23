import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import type { loadPlanRunConfig } from '@openthrottle/openthrottle-agentic-loop';
import type { WorkflowCorrelation } from '@openthrottle/openthrottle-agentic-utils';

import type { RunPlanOrchestratorJobData } from '../../queues/plans/plans.types.ts';
import type { ProvisionedPlanRunWorktree } from '../plan-run-worktree-provision/plan-run-worktree-provision.types.ts';

/** @description The repo's the `defaults` block of `.openthrottle/ot-loop.json` (merged with env) as `loadPlanRunConfig` returns it. */
export type PlanRunWorkspaceConfig = ReturnType<typeof loadPlanRunConfig>;

/**
 * @description Inputs to {@link PlanRunWorkspaceService.prepare}. The OT Loop runner passes the
 * job payload and correlation plus the two `skip*` flags.
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
  /** True skips foreign-skill injection (the OT Loop worker uses no skills). */
  readonly skipSkillInjection: boolean;
}

/** @description What a run needs once its workspace is ready. */
export interface PreparedPlanRunWorkspace {
  /** The repo's workflow config, with the OT root applied to the process env. */
  readonly config: PlanRunWorkspaceConfig;
  /** Names of foreign OT skills materialized for this run; empty when none (or skipped). */
  readonly injectedSkillNames: readonly string[];
  /** The `plan_runs` row resolved from the correlation, or null when unresolved. */
  readonly run: PlanRun | null;
  /** The directory the agent runs in: the provisioned worktree, else the base checkout. */
  readonly workingDirectory: string;
}
