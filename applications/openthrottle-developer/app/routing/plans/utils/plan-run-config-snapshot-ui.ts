/**
 * @description Compares persisted plan run snapshots to current Configuration tab state.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import {
  DEFAULT_RUN_DRIVER,
  formatPlanRunDriverLabel,
} from '~/routing/plans/utils/plan-run-options';

/** @description The agent tuning block of a run snapshot (the snapshot's `run` block). */
interface PlanRunSnapshotAgentShape {
  readonly driver: string | undefined;
  readonly effort: string | undefined;
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

interface PlanRunSnapshotShape {
  readonly agent?: PlanRunSnapshotAgentShape;
  readonly workspace?: {
    readonly workingDirectory?: string;
  };
}

const parseSnapshotAgent = (
  raw: unknown,
): PlanRunSnapshotAgentShape | undefined => {
  if (!isRecord(raw)) {
    return undefined;
  }

  return {
    driver: readString(raw.driver),
    effort: readNonEmptyString(raw.effort),
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

  const agent = parseSnapshotAgent(parsed.run);
  const workspace = parseSnapshotWorkspace(parsed.workspace);

  return { agent, workspace };
};

/**
 * @description Returns human-readable labels when a queued run snapshot differs from current config.
 */
export const buildPlanRunSnapshotDiffLabels = (
  runConfigSnapshotJson: string | null | undefined,
  current: {
    readonly workflowInput: PlanRunOptions;
    readonly workingDirectory: string;
  },
): string[] => {
  const snapshot = parseSnapshot(runConfigSnapshotJson);
  if (snapshot == null) {
    return [];
  }

  const labels: string[] = [];
  const snapshotDriver = snapshot.agent?.driver ?? DEFAULT_RUN_DRIVER;
  const currentDriver = current.workflowInput.driver ?? DEFAULT_RUN_DRIVER;

  if (snapshotDriver !== currentDriver) {
    labels.push(
      `Driver: ${formatPlanRunDriverLabel(snapshotDriver)} → ${formatPlanRunDriverLabel(currentDriver)} (current)`,
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
 * the run config snapshot; null when the snapshot is missing or recorded none.
 */
export const readPlanRunSnapshotEffort = (
  runConfigSnapshotJson: string | null | undefined,
): string | null => {
  return parseSnapshot(runConfigSnapshotJson)?.agent?.effort ?? null;
};

/**
 * @description The model a run used: the row's own `model` column when set, else the
 * snapshot's recorded model; null when neither recorded one.
 */
export const readPlanRunModel = (row: {
  readonly model?: string | null;
  readonly runConfigSnapshotJson?: string | null;
}): string | null => {
  const own = readNonEmptyString(row.model);
  if (own !== undefined) {
    return own;
  }

  return parseSnapshot(row.runConfigSnapshotJson)?.agent?.model ?? null;
};
