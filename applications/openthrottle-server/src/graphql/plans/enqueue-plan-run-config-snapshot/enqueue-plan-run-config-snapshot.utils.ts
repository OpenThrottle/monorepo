/**
 * @description Builds {@link PlanRunConfigSnapshot} from validated BullMQ plan-run job data at enqueue.
 */

import {
  buildPlanRunConfigSnapshot,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
  type PlanJobRunHooksStorage,
  type PlanRunConfigOtLoop,
  type PlanRunConfigRunner,
  type PlanRunConfigSnapshot,
} from '@openthrottle/nestjs-repositories';

import { isRunPlanOrchestratorJobData } from '../../../queues/agentic-ralph/agentic-ralph.utils.ts';
import type { RunPlanJobData } from '../../../queues/plans/plans.types.ts';
import type { RalphPlanRunTuningInput } from '../plan.input.ts';

/**
 * @description The `buildRunPlanOrchestratorJobData` input that reproduces a run's job payload from
 * its frozen {@link PlanRunConfigSnapshot}. See {@link orchestratorJobInputFromSnapshot}.
 */
interface OrchestratorJobInputFromSnapshot {
  readonly jobRunHooksJson: null;
  readonly materializedHookEntries: readonly [];
  readonly mode: 'task' | null;
  readonly otLoop: PlanRunConfigOtLoop | null;
  readonly planId: string;
  readonly planJobRunHooks: PlanJobRunHooksStorage | null;
  readonly ralph: RalphPlanRunTuningInput;
  readonly runner: PlanRunConfigRunner | null;
  readonly taskId: string | null;
  readonly workingDirectory: string | null;
}

/**
 * @description Registered workspace ids resolved at enqueue (the run's `workingDirectory` is
 * already the resolved path on `jobData`). Recorded on the snapshot for audit/traceability.
 */
interface ResolvedWorkspaceIds {
  readonly checkoutId?: string | null;
  readonly repositoryId?: string | null;
}

type SnapshotBackend = PlanRunConfigSnapshot['ralph']['executionBackend'];

const nonDefaultBackend = (
  backend: SnapshotBackend,
): SnapshotBackend | null => {
  if (backend === DEFAULT_PLAN_RUN_RALPH_RUNNER) {
    return null;
  }
  return backend;
};

const workingDirectoryOrNull = (workingDirectory: string): string | null => {
  if (workingDirectory === '') {
    return null;
  }
  return workingDirectory;
};

const toRalphSnapshot = (ralph: RunPlanJobData['ralph'] | null) => {
  if (!ralph) {
    return null;
  }

  return {
    debug: ralph.debug ?? null,
    effort: ralph.effort ?? null,
    iterationTimeoutSeconds: ralph.iterationTimeoutSeconds ?? null,
    iterations: ralph.iterations ?? null,
    model: ralph.model ?? null,
    project: ralph.project ?? null,
    prompt: ralph.prompt ?? null,
    promptFile: ralph.promptFile ?? null,
    skipWorktreeSetup: ralph.skipWorktreeSetup ?? null,
    worktree: ralph.worktree ?? null,
    worktreeBase: ralph.worktreeBase ?? null,
  };
};

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
  const ralphSnapshot = toRalphSnapshot(jobData.ralph ?? null);

  if (isRunPlanOrchestratorJobData(jobData)) {
    const mode = jobData.mode === 'task' ? 'task' : 'plan';
    return buildPlanRunConfigSnapshot({
      checkoutId,
      executionBackend,
      jobRunHooks,
      mode,
      otLoop: jobData.otLoop ?? null,
      ralph: ralphSnapshot,
      repositoryId,
      runner: jobData.runner ?? null,
      taskId: jobData.taskId ?? null,
      workingDirectory,
    });
  }

  return buildPlanRunConfigSnapshot({
    checkoutId,
    executionBackend,
    jobRunHooks,
    mode: 'plan',
    ralph: ralphSnapshot,
    repositoryId,
    workingDirectory,
  });
};

/**
 * @description The inverse of {@link buildPlanRunConfigSnapshotFromJobData}: the
 * `buildRunPlanOrchestratorJobData` input that rebuilds a run's BullMQ payload from its frozen
 * snapshot, for a run whose job was lost (the scheduled-run boot reconcile). Going back through
 * `buildRunPlanOrchestratorJobData` rather than assembling the payload by hand re-applies the same
 * validation an enqueue does, so a workspace that has since disappeared fails loudly here.
 *
 * Faithful by construction: the snapshot already holds the merged lifecycle hooks (fed back as the
 * stored hooks, with no materialized entries, so nothing is merged in twice), the resolved
 * workspace, and the tuning after programmatic defaults (`applyPlanRunProgrammaticDefaults`), which
 * always set `debug` and, unless the caller opted out, `worktree`. So an absent `worktree` maps back
 * to `disableWorktree`, and an absent `debug` — the snapshot drops `'omit'` — maps back to the
 * caller's `'omit'` instead of letting the verbose default return. The backend is passed only when it
 * is not the default runner: the snapshot always records one, and the original payload carried a
 * `ralph.backend` only when the caller chose one (an explicit default-runner choice rebuilds without
 * the key — the same run). A plan-mode snapshot maps back to the unset `mode` an orchestrator
 * enqueue uses. The job priority is not in the snapshot and is not returned; callers use the default.
 */
export const orchestratorJobInputFromSnapshot = (
  planId: string,
  snapshot: PlanRunConfigSnapshot,
): OrchestratorJobInputFromSnapshot => {
  const { ralph, target, workspace } = snapshot;
  const isTaskMode = target.mode === 'task';

  return {
    jobRunHooksJson: null,
    materializedHookEntries: [],
    mode: isTaskMode ? 'task' : null,
    otLoop: snapshot.otLoop ?? null,
    planId,
    planJobRunHooks: snapshot.jobRunHooks ?? null,
    ralph: {
      backend: nonDefaultBackend(ralph.executionBackend),
      disableWorktree: ralph.worktree === undefined,
      effort: ralph.effort ?? null,
      iterationTimeoutSeconds: ralph.iterationTimeoutSeconds ?? null,
      iterations: ralph.iterations ?? null,
      model: ralph.model ?? null,
      project: ralph.project ?? null,
      prompt: ralph.prompt ?? null,
      promptFile: ralph.promptFile ?? null,
      ralphDebugCli: ralph.debug ?? 'omit',
      skipWorktreeSetup: ralph.skipWorktreeSetup ?? null,
      worktree: ralph.worktree ?? null,
      worktreeBase: ralph.worktreeBase ?? null,
    },
    runner: snapshot.runner ?? null,
    taskId: isTaskMode ? target.taskId : null,
    workingDirectory: workingDirectoryOrNull(workspace.workingDirectory),
  };
};
