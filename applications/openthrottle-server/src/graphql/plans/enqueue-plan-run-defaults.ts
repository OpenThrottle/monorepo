/**
 * Server-side defaults for programmatic (BullMQ) plan runs: a worktree OpenThrottle creates
 * itself, and verbose agent logging. Applied AFTER caller input so every enqueue path — the
 * GraphQL mutation, scheduled agent jobs, tag-action rules, the Ralph CLI handoff — inherits
 * them, and the developer UI is only ever reflecting the same shared defaults.
 *
 * See docs/openthrottle/plan-run-worktrees.md.
 */

import {
  buildPlanRunWorktreeName,
  DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI,
} from '@openthrottle/nestjs-repositories';
import type { RalphNestedRunTuningInput } from '@tools/workflows';

/**
 * @description Applies the programmatic run defaults to parsed caller tuning.
 *
 * Only *omission* gets a default; an explicit choice always survives:
 * - `debug` absent → `'verbose'`. An explicit `ralphDebugCli: 'omit'` is carried through as
 *   `debug: 'omit'` — that is the opt-out sentinel for logging, and it is why
 *   `parseEnqueueRalphTuning` preserves `'omit'` rather than dropping it.
 * - `worktree` absent → the plan's derived name (`plan-<short plan id>`), unless the caller
 *   opted out with `disableWorktree: true`, which leaves `worktree` absent. Absence of
 *   `ralph.worktree` on the job payload is therefore a deliberate "run in the base checkout",
 *   not "nobody said".
 */
export const applyPlanRunProgrammaticDefaults = (input: {
  readonly disableWorktree?: boolean | null;
  readonly planId: string;
  readonly ralph: RalphNestedRunTuningInput | undefined;
}): RalphNestedRunTuningInput => {
  const { disableWorktree, planId, ralph } = input;

  const debug = ralph?.debug ?? DEFAULT_PLAN_RUN_RALPH_DEBUG_CLI;

  const callerWorktree =
    typeof ralph?.worktree === 'string' && ralph.worktree.trim() !== ''
      ? ralph.worktree.trim()
      : undefined;

  const worktree =
    disableWorktree === true
      ? undefined
      : (callerWorktree ?? buildPlanRunWorktreeName(planId));

  return {
    ...(ralph ?? {}),
    debug,
    ...(worktree !== undefined ? { worktree } : {}),
  };
};
