/**
 * @description Merges the enqueue-time {@link PlanRunTuningMergeInput} over file + env defaults
 * from `loadPlanRunConfig`. Precedence: **enqueue tuning > env > file > built-ins**.
 */

import type { WorkflowConfigDebug } from '@openthrottle/openthrottle-agentic-utils';

import type { PlanRunResolvedDefaults } from '../contract/index.ts';

/**
 * @description Subset of the job's run tuning that the defaults can fill in.
 * @public
 */
export interface PlanRunTuningMergeInput {
  readonly debug?: WorkflowConfigDebug | null;
  readonly driver?: string | null;
  readonly effort?: string | null;
  readonly iterationTimeoutSeconds?: number | null;
  readonly model?: string | null;
}

/**
 * @description The run tuning OT Loop executes with: enqueue tuning resolved over the defaults.
 * @public
 */
export interface PlanRunMergedTuning {
  readonly debug: WorkflowConfigDebug;
  readonly driver: string;
  readonly effort: string | null | undefined;
  readonly iterationTimeoutSeconds: number | undefined;
  readonly model: string;
  /** @description Base branch from the defaults; there is no enqueue override. */
  readonly worktreeBase: string | undefined;
}

const hasString = (value: string | null | undefined): value is string => {
  return value != null && value.trim() !== '';
};

/**
 * @description Applies enqueue / job tuning over merged file + env defaults. Omitted tuning
 * fields fall through to {@link config}; explicit null/undefined on tuning means “use lower layers”.
 * @public
 */
export const mergePlanRunTuningWithConfig = (
  tuning: PlanRunTuningMergeInput | null | undefined,
  config: PlanRunResolvedDefaults,
): PlanRunMergedTuning => {
  const r = tuning ?? {};

  return {
    debug: r.debug ?? config.debug,
    driver: r.driver ?? config.driver,
    // No file/env layer for effort: it is enqueue-only, so it passes straight through.
    effort: r.effort,
    iterationTimeoutSeconds:
      r.iterationTimeoutSeconds ?? config.iterationTimeout ?? undefined,
    model: hasString(r.model) ? r.model.trim() : config.model,
    worktreeBase: config.worktreeBase,
  };
};
