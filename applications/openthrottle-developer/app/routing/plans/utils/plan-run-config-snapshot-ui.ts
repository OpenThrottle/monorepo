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

const readNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return value.trim();
};

const readString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const readNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' ? value : undefined;
};

interface PlanRunSnapshotShape {
  readonly ralph?: PlanRunSnapshotRalphShape;
  readonly workspace?: {
    readonly workingDirectory?: string;
  };
}

const parseSnapshotRalph = (
  raw: unknown,
): PlanRunSnapshotRalphShape | undefined => {
  if (!isRecord(raw)) {
    return undefined;
  }

  return {
    effort: readNonEmptyString(raw.effort),
    executionBackend: readString(raw.executionBackend),
    iterations: readNumber(raw.iterations),
    model: readNonEmptyString(raw.model),
  };
};

const parseSnapshotWorkspace = (
  raw: unknown,
): PlanRunSnapshotShape['workspace'] => {
  if (!isRecord(raw)) {
    return undefined;
  }

  return { workingDirectory: readString(raw.workingDirectory) };
};

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

  const ralph = parseSnapshotRalph(parsed.ralph);
  const workspace = parseSnapshotWorkspace(parsed.workspace);

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
): string | null => {
  return parseSnapshot(runConfigSnapshotJson)?.ralph?.effort ?? null;
};

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
