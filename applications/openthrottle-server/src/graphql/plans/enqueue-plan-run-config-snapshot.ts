/**
 * @description Builds {@link PlanRunConfigSnapshot} from validated BullMQ plan-run job data at enqueue.
 */

import type { RunPlanJobData } from '../../queues/plans/plans.types';
import { isRunPlanOrchestratorJobData } from '../../queues/plans/plans.types';
import {
  buildPlanRunConfigSnapshot,
  type PlanRunConfigSnapshot,
} from '@openthrottle/nestjs-repositories';

/**
 * @description Registered workspace ids resolved at enqueue (the run's `workingDirectory` is
 * already the resolved path on `jobData`). Recorded on the snapshot for audit/traceability.
 */
interface ResolvedWorkspaceIds {
  readonly checkoutId?: string | null;
  readonly repositoryId?: string | null;
}

/**
 * @description Captures the resolved configuration enqueued for audit on `plan_runs.run_config_snapshot`.
 */
export const buildPlanRunConfigSnapshotFromJobData = (
  jobData: RunPlanJobData,
  workspaceIds?: ResolvedWorkspaceIds,
): PlanRunConfigSnapshot => {
  const executionBackend = jobData.executionBackend ?? 'cursor';
  const workingDirectory = jobData.workingDirectory ?? null;
  const checkoutId = workspaceIds?.checkoutId ?? null;
  const repositoryId = workspaceIds?.repositoryId ?? null;
  const jobRunHooks = jobData.jobRunHooks ?? null;
  const ralph = jobData.ralph ?? null;

  if (isRunPlanOrchestratorJobData(jobData)) {
    const mode = jobData.mode === 'task' ? 'task' : 'plan';
    return buildPlanRunConfigSnapshot({
      checkoutId,
      executionBackend,
      jobRunHooks,
      mode,
      ralph: ralph
        ? {
            debug: ralph.debug ?? null,
            iterationTimeoutSeconds: ralph.iterationTimeoutSeconds ?? null,
            iterations: ralph.iterations ?? null,
            model: ralph.model ?? null,
            project: ralph.project ?? null,
            prompt: ralph.prompt ?? null,
            promptFile: ralph.promptFile ?? null,
            skipWorktreeSetup: ralph.skipWorktreeSetup ?? null,
            worktree: ralph.worktree ?? null,
            worktreeBase: ralph.worktreeBase ?? null,
          }
        : null,
      repositoryId,
      taskId: jobData.taskId ?? null,
      workingDirectory,
    });
  }

  return buildPlanRunConfigSnapshot({
    checkoutId,
    executionBackend,
    jobRunHooks,
    mode: 'plan',
    ralph: ralph
      ? {
          debug: ralph.debug ?? null,
          iterationTimeoutSeconds: ralph.iterationTimeoutSeconds ?? null,
          iterations: ralph.iterations ?? null,
          model: ralph.model ?? null,
          project: ralph.project ?? null,
          prompt: ralph.prompt ?? null,
          promptFile: ralph.promptFile ?? null,
          skipWorktreeSetup: ralph.skipWorktreeSetup ?? null,
          worktree: ralph.worktree ?? null,
          worktreeBase: ralph.worktreeBase ?? null,
        }
      : null,
    repositoryId,
    workingDirectory,
  });
};
