import type {
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-workflow';

import type { ProvisionedPlanRunWorktree } from '../../../services/plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import type { RunPlanOrchestratorJobData } from '../../agentic-ralph/agentic-ralph.types.ts';

/**
 * @description The parameters `PlansProcessor` hands a runner, identical for Ralph and OT Loop so the
 * processor dispatches on `jobData.runner` without reshaping anything.
 */
export interface RunOtLoopJobParams {
  readonly correlation?: WorkflowCorrelation;
  readonly jobData: RunPlanOrchestratorJobData;
  /** Accepted for parity with Ralph; OT Loop emits no per-iteration lifecycle events in v1 (§ 9). */
  readonly lifecycleDispatcher?: WorkflowLifecycleDispatcher;
  /** Called once when the run was provisioned into its own worktree, so the worker can tear it down. */
  readonly onWorktreeProvisioned?: (
    worktree: ProvisionedPlanRunWorktree,
  ) => void;
  readonly signal?: AbortSignal;
  /** The processor's run work-session id; carried on status writes, never ended by the loop. */
  readonly workSessionId?: string | null;
}
