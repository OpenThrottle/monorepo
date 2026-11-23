import type {
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-utils';

import type { ProvisionedPlanRunWorktree } from '../../../services/plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import type { RunPlanOrchestratorJobData } from '../../plans/plans.types.ts';

/**
 * @description The parameters `PlansProcessor` hands the OT Loop runner.
 */
export interface RunOtLoopJobParams {
  readonly correlation?: WorkflowCorrelation;
  readonly jobData: RunPlanOrchestratorJobData;
  /** Accepted for the shared runner contract; OT Loop emits no per-iteration lifecycle events in v1 (§ 9). */
  readonly lifecycleDispatcher?: WorkflowLifecycleDispatcher;
  /** Called once when the run was provisioned into its own worktree, so the worker can tear it down. */
  readonly onWorktreeProvisioned?: (
    worktree: ProvisionedPlanRunWorktree,
  ) => void;
  readonly signal?: AbortSignal;
  /** The processor's run work-session id; carried on status writes, never ended by the loop. */
  readonly workSessionId?: string | null;
}
