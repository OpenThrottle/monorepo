/**
 * @description Compares persisted plan run snapshots to current Configuration tab state.
 */

import { isRecord } from '@openthrottle/nodejs-utils';
import {
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
} from '@openthrottle/openthrottle-plan-config';

import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { formatWorkflowRalphExecutionBackendLabel } from '~/routing/plans/utils/build-workflow-ralph-argv';

interface PlanRunSnapshotRalphShape {
  readonly effort: string | undefined;
  readonly executionBackend: string | undefined;
  readonly iterations: number | undefined;
  readonly model: string | undefined;
}

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

interface PlanRunSnapshotShape {
  readonly ralph?: PlanRunSnapshotRalphShape;
  readonly workspace?: {
    readonly workingDirectory?: string;
  };
}

const parseSnapshot = (
  runConfigSnapshotJson: string | null | undefined,
): PlanRunSnapshotShape | null => {
  if (runConfigSnapshotJson == null || runConfigSnapshotJson.trim() === '') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(runConfigSnapshotJson);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const ralphRaw = parsed.ralph;
  const ralph: PlanRunSnapshotRalphShape | undefined = isRecord(ralphRaw)
    ? {
        effort: readNonEmptyString(ralphRaw.effort),
        executionBackend:
          typeof ralphRaw.executionBackend === 'string'
            ? ralphRaw.executionBackend
            : undefined,
        iterations:
          typeof ralphRaw.iterations === 'number'
            ? ralphRaw.iterations
            : undefined,
        model: readNonEmptyString(ralphRaw.model),
      }
    : undefined;

  const workspaceRaw = parsed.workspace;
  const workspace = isRecord(workspaceRaw)
    ? {
        workingDirectory:
          typeof workspaceRaw.workingDirectory === 'string'
            ? workspaceRaw.workingDirectory
            : undefined,
      }
    : undefined;

  return { ralph, workspace };
};

/**
 * @description Returns human-readable labels when a queued run snapshot differs from current config.
 */
export const buildPlanRunSnapshotDiffLabels = (
  runConfigSnapshotJson: string | null | undefined,
  current: {
    readonly workflowInput: WorkflowRalphRunOptionsInput;
    readonly workingDirectory: string;
  },
): string[] => {
  const snapshot = parseSnapshot(runConfigSnapshotJson);
  if (snapshot == null) {
    return [];
  }

  const labels: string[] = [];
  const snapshotBackend =
    snapshot.ralph?.executionBackend ?? DEFAULT_PLAN_RUN_RALPH_RUNNER;
  const currentBackend =
    current.workflowInput.executionBackend ?? DEFAULT_PLAN_RUN_RALPH_RUNNER;

  if (snapshotBackend !== currentBackend) {
    labels.push(
      `Backend: ${formatWorkflowRalphExecutionBackendLabel(snapshotBackend)} → ${formatWorkflowRalphExecutionBackendLabel(currentBackend)} (current)`,
    );
  }

  const snapshotIterations =
    snapshot.ralph?.iterations ?? DEFAULT_PLAN_RUN_RALPH_ITERATIONS;
  const currentIterations =
    current.workflowInput.iterations ?? DEFAULT_PLAN_RUN_RALPH_ITERATIONS;

  if (snapshotIterations !== currentIterations) {
    labels.push(
      `Iterations: ${snapshotIterations} → ${currentIterations} (current)`,
    );
  }

  const snapshotWorkspace = snapshot.workspace?.workingDirectory ?? '';
  const currentWorkspace = current.workingDirectory.trim();

  if (snapshotWorkspace !== currentWorkspace) {
    const snapshotLabel =
      snapshotWorkspace === '' ? '(monorepo root)' : snapshotWorkspace;
    const currentLabel =
      currentWorkspace === '' ? '(monorepo root)' : currentWorkspace;
    labels.push(`Workspace: ${snapshotLabel} → ${currentLabel} (current)`);
  }

  return labels;
};

/**
 * @description The directory a queued run actually worked in, from
 * `run_config_snapshot.workspace.workingDirectory`. For a default run that is the worktree
 * OpenThrottle created at job start (the orchestrator re-points the snapshot once it knows the
 * path); null when the run predates the snapshot or recorded nothing.
 */
export const readPlanRunSnapshotWorkspacePath = (
  runConfigSnapshotJson: string | null | undefined,
): string | null => {
  const snapshot = parseSnapshot(runConfigSnapshotJson);
  const path = snapshot?.workspace?.workingDirectory?.trim();
  return path === undefined || path === '' ? null : path;
};

/**
 * @description The reasoning effort a run was enqueued with, from
 * `run_config_snapshot.ralph.effort`; null when the snapshot is missing or recorded none.
 */
export const readPlanRunSnapshotEffort = (
  runConfigSnapshotJson: string | null | undefined,
): string | null => parseSnapshot(runConfigSnapshotJson)?.ralph?.effort ?? null;

/**
 * @description The model a run used: the row's own `model` column when set, else the
 * snapshot's `ralph.model`; null when neither recorded one.
 */
export const readPlanRunModel = (row: {
  readonly model?: string | null;
  readonly runConfigSnapshotJson?: string | null;
}): string | null => {
  const own = readNonEmptyString(row.model);
  if (own !== undefined) {
    return own;
  }

  return parseSnapshot(row.runConfigSnapshotJson)?.ralph?.model ?? null;
};
