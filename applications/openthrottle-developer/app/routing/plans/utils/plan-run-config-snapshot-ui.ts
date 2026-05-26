/**
 * @description Compares persisted plan run snapshots to current Configuration tab state.
 */

import {
  DEFAULT_PLAN_RUN_RALPH_ITERATIONS,
  DEFAULT_PLAN_RUN_RALPH_RUNNER,
} from '../../../../../../packages/nestjs-repositories/src/modules/plans/plan-run-config/index.js';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { formatWorkflowRalphExecutionBackendLabel } from '~/routing/plans/utils/build-workflow-ralph-argv';

interface PlanRunSnapshotRalphShape {
  readonly executionBackend?: string;
  readonly iterations?: number;
}

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

  try {
    return JSON.parse(runConfigSnapshotJson) as PlanRunSnapshotShape;
  } catch {
    return null;
  }
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
