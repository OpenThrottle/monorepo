/**
 * @description Human-readable lines describing how the current plan run options differ
 * from the UI baseline (Configuration → Reset to defaults), used by the run-transparency
 * panel. Empty when the options match the defaults for the same target.
 */

import type { PlanRunOptions } from './plan-run-options';
import {
  DEFAULT_RUN_MODEL,
  getPlanRunOptionsBaseline,
  parsePlanRunTimeoutSeconds,
} from './plan-run-options';

/**
 * @description Human-readable lines describing how the current run options differ from the
 * UI baseline (Configuration → Reset to defaults). Empty when they match the defaults for
 * the same target.
 */
export const buildPlanRunTuningDiffLabels = (
  input: PlanRunOptions,
  iterationTimeoutText: string,
): readonly string[] => {
  const ref = getPlanRunOptionsBaseline(input);
  const cur: PlanRunOptions = {
    ...input,
    iterationTimeoutSeconds: parsePlanRunTimeoutSeconds(iterationTimeoutText),
  };
  const refMerged: PlanRunOptions = {
    ...ref,
    iterationTimeoutSeconds: undefined,
  };

  const lines: string[] = [];

  if (cur.driver !== refMerged.driver) {
    lines.push(`Driver: ${refMerged.driver} → ${cur.driver}`);
  }

  const curTimeout = cur.iterationTimeoutSeconds;
  const refTimeout = refMerged.iterationTimeoutSeconds;
  if (curTimeout !== refTimeout) {
    lines.push(
      `Agent timeout (seconds): ${
        refTimeout == null ? 'default' : String(refTimeout)
      } → ${curTimeout == null ? 'default' : String(curTimeout)}`,
    );
  }

  const curModel = cur.model.trim();
  const refModel = refMerged.model.trim();
  if (curModel !== refModel) {
    lines.push(
      `Model: ${refModel === '' ? DEFAULT_RUN_MODEL : refModel} → ${
        curModel === '' ? DEFAULT_RUN_MODEL : curModel
      }`,
    );
  }

  const curEffort = cur.effort.trim();
  const refEffort = refMerged.effort.trim();
  if (curEffort !== refEffort) {
    lines.push(
      `Effort: ${refEffort === '' ? 'default' : refEffort} → ${
        curEffort === '' ? 'default' : curEffort
      }`,
    );
  }

  if (cur.worktreeName.trim() !== refMerged.worktreeName.trim()) {
    lines.push(
      `Worktree name: ${
        refMerged.worktreeName.trim() === ''
          ? 'derived from the plan id'
          : refMerged.worktreeName.trim()
      } → ${cur.worktreeName.trim()}`,
    );
  }

  if (cur.worktreeCleanup !== refMerged.worktreeCleanup) {
    lines.push(
      `Worktree cleanup: ${refMerged.worktreeCleanup} → ${cur.worktreeCleanup}`,
    );
  }

  return lines;
};
