/**
 * Server-side defaults for programmatic (BullMQ) plan runs: a worktree OpenThrottle creates
 * itself, and verbose agent logging. Applied AFTER caller input so every enqueue path — the
 * GraphQL mutation, scheduled agent jobs, tag-action rules, the interactive /ot-loop registration — inherits
 * them, and the developer UI is only ever reflecting the same shared defaults.
 *
 * See docs/openthrottle/plan-run-worktrees.md.
 */

import type { PlanRunTuningSettings } from '@openthrottle/openthrottle-agentic-utils';
import {
  buildPlanRunWorktreeName,
  DEFAULT_PLAN_RUN_DEBUG_CLI,
} from '@openthrottle/openthrottle-plan-config';

/**
 * @description Applies the programmatic run defaults to parsed caller tuning.
 *
 * Only *omission* gets a default; an explicit choice always survives:
 * - `debug` absent → `'verbose'`. An explicit `debugCli: 'omit'` is carried through as
 *   `debug: 'omit'` — that is the opt-out sentinel for logging, and it is why
 *   `parseEnqueuePlanRunTuning` preserves `'omit'` rather than dropping it.
 * - `worktreeName` absent → the plan's derived name (`plan-<short plan id>`). Every run gets a
 *   worktree; there is no opt-out.
 */
export const applyPlanRunProgrammaticDefaults = (input: {
  readonly planId: string;
  readonly tuning: PlanRunTuningSettings | undefined;
}): PlanRunTuningSettings => {
  const { planId, tuning } = input;

  const debug = tuning?.debug ?? DEFAULT_PLAN_RUN_DEBUG_CLI;

  let callerWorktree: string | undefined;
  if (
    typeof tuning?.worktreeName === 'string' &&
    tuning.worktreeName.trim() !== ''
  ) {
    callerWorktree = tuning.worktreeName.trim();
  }

  return {
    ...(tuning ?? {}),
    debug,
    worktreeName: callerWorktree ?? buildPlanRunWorktreeName(planId),
  };
};
