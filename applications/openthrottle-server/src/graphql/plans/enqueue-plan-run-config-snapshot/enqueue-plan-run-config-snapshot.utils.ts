/**
 * @description Builds {@link PlanRunConfigSnapshot} from validated BullMQ plan-run job data at enqueue.
 */

import type {
  PlanJobRunHooksStorage,
  PlanRunConfigOtLoop,
  PlanRunConfigSnapshot,
} from '@openthrottle/openthrottle-plan-config';
import {
  buildPlanRunConfigSnapshot,
  DEFAULT_PLAN_RUN_DRIVER,
  pickPlanRunConfigOtLoop,
} from '@openthrottle/openthrottle-plan-config';

import type { RunPlanJobData } from '../../../queues/plans/plans.types.ts';
import { isRunPlanOrchestratorJobData } from '../../../queues/plans/plans.utils.ts';
import type { PlanRunTuningInput } from '../plan.input.ts';

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
  readonly taskId: string | null;
  readonly tuning: PlanRunTuningInput;
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

type SnapshotDriver = PlanRunConfigSnapshot['run']['driver'];

const nonDefaultDriver = (driver: SnapshotDriver): SnapshotDriver | null => {
  if (driver === DEFAULT_PLAN_RUN_DRIVER) {
    return null;
  }
  return driver;
};

const workingDirectoryOrNull = (workingDirectory: string): string | null => {
  if (workingDirectory === '') {
    return null;
  }
  return workingDirectory;
};

const toSnapshotTuning = (tuning: RunPlanJobData['tuning'] | null) => {
  if (!tuning) {
    return null;
  }

  return {
    debug: tuning.debug ?? null,
    effort: tuning.effort ?? null,
    iterationTimeoutSeconds: tuning.iterationTimeoutSeconds ?? null,
    model: tuning.model ?? null,
    worktreeName: tuning.worktreeName ?? null,
  };
};

/**
 * @description Captures the resolved configuration enqueued for audit on `plan_runs.run_config_snapshot`.
 */
export const buildPlanRunConfigSnapshotFromJobData = (
  jobData: RunPlanJobData,
  workspaceIds?: ResolvedWorkspaceIds,
): PlanRunConfigSnapshot => {
  const driver = jobData.driver ?? DEFAULT_PLAN_RUN_DRIVER;
  const workingDirectory = jobData.workingDirectory ?? null;
  const checkoutId = workspaceIds?.checkoutId ?? null;
  const repositoryId = workspaceIds?.repositoryId ?? null;
  const jobRunHooks = jobData.jobRunHooks ?? null;
  const tuningSnapshot = toSnapshotTuning(jobData.tuning ?? null);

  if (isRunPlanOrchestratorJobData(jobData)) {
    const mode = jobData.mode === 'task' ? 'task' : 'plan';
    return buildPlanRunConfigSnapshot({
      checkoutId,
      driver,
      jobRunHooks,
      mode,
      otLoop: jobData.otLoop ?? null,
      repositoryId,
      taskId: jobData.taskId ?? null,
      tuning: tuningSnapshot,
      workingDirectory,
    });
  }

  return buildPlanRunConfigSnapshot({
    checkoutId,
    driver,
    jobRunHooks,
    mode: 'plan',
    repositoryId,
    tuning: tuningSnapshot,
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
 * always set `debug` and, unless the caller opted out, `worktreeName`. So an absent `debug` — the snapshot drops `'omit'` — maps back to the
 * caller's `'omit'` instead of letting the verbose default return. The driver is passed only when it
 * is not the default runner: the snapshot always records one, and the original payload carried a
 * `tuning.driver` only when the caller chose one (an explicit default-runner choice rebuilds without
 * the key — the same run). A plan-mode snapshot maps back to the unset `mode` an orchestrator
 * enqueue uses. The job priority is not in the snapshot and is not returned; callers use the default.
 */
export const orchestratorJobInputFromSnapshot = (
  planId: string,
  snapshot: PlanRunConfigSnapshot,
): OrchestratorJobInputFromSnapshot => {
  const { run, target, workspace } = snapshot;
  const isTaskMode = target.mode === 'task';

  return {
    jobRunHooksJson: null,
    materializedHookEntries: [],
    mode: isTaskMode ? 'task' : null,
    otLoop: pickPlanRunConfigOtLoop(run) ?? null,
    planId,
    planJobRunHooks: snapshot.jobRunHooks ?? null,
    taskId: isTaskMode ? target.taskId : null,
    tuning: {
      debugCli: run.debug ?? 'omit',
      driver: nonDefaultDriver(run.driver),
      effort: run.effort ?? null,
      iterationTimeoutSeconds: run.iterationTimeoutSeconds ?? null,
      model: run.model ?? null,
      worktreeName: run.worktreeName ?? null,
    },
    workingDirectory: workingDirectoryOrNull(workspace.workingDirectory),
  };
};
