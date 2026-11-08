import { SCHEDULED_PLAN_RUN_GRACE_MS } from '../plans.constants.ts';
import type {
  ScheduledPlanRunFireDecision,
  ScheduledPlanRunReprojectDecision,
} from './scheduled-plan-run.types.ts';

/** @description The instants the scheduled-run policy judges lateness from. */
interface ScheduledPlanRunTiming {
  readonly now: Date;
  /** The instant the run was scheduled for (`plan_runs.scheduled_for`). */
  readonly scheduledFor: Date;
}

const formatLateness = (lateByMs: number): string => {
  const minutes = Math.floor(lateByMs / 60_000);

  if (minutes < 120) {
    return `${minutes} minutes`;
  }

  return `${Math.floor(minutes / 60)} hours`;
};

/**
 * @description Pure grace-window policy for a scheduled run, used by the boot reconcile when the
 * run's delayed BullMQ job is missing (Redis flushed, volume recreated). A run that is LESS than
 * {@link SCHEDULED_PLAN_RUN_GRACE_MS} past `scheduled_for` is re-enqueued with the time still left
 * (never negative, so a run that is already due goes immediately); one exactly that late or later is
 * `missed`. A `scheduledFor` that is not a valid instant is `missed` too — there is nothing to wait for.
 */
export const decideScheduledPlanRunReproject = (
  params: ScheduledPlanRunTiming,
): ScheduledPlanRunReprojectDecision => {
  const scheduledForMs = params.scheduledFor.getTime();

  if (Number.isNaN(scheduledForMs)) {
    return { kind: 'missed', reason: 'its scheduled time could not be read' };
  }

  const untilFireMs = scheduledForMs - params.now.getTime();
  const lateByMs = -untilFireMs;

  if (lateByMs >= SCHEDULED_PLAN_RUN_GRACE_MS) {
    return {
      kind: 'missed',
      reason: `it was ${formatLateness(lateByMs)} late, past the ${SCHEDULED_PLAN_RUN_GRACE_MS / 60_000}-minute grace window`,
    };
  }

  return { delayMs: Math.max(0, untilFireMs), kind: 'enqueue' };
};

/**
 * @description Pure fire-time policy for a scheduled run whose delayed job just fired: everything
 * {@link decideScheduledPlanRunReproject} decides about lateness, plus the rules only a firing run
 * has. Precedence, first match wins:
 *
 * 1. **Missed** — lateness is a property of the schedule alone: a run past the grace window would
 *    not start even on an idle plan, so it reports MISSED rather than SUPERSEDED when it is BOTH late
 *    and colliding. (It is also what the boot reconcile, which never looks at other runs, would say.)
 * 2. **Superseded** — the plan has another active run; never double-run a plan, since two
 *    orchestrators racing for the same PENDING tasks is corruption.
 * 3. **Nothing to run** — no task a run could pick up; settle cleanly rather than fabricate work.
 *    It outranks a missing workspace: a run with no work settles COMPLETED wherever it would have run.
 * 4. **Workspace missing** — `workspaceError` is set: the run's working directory no longer exists
 *    or is no longer usable. The checkout is deliberately not held against prune while the run waits
 *    (holding a row cannot bring a deleted worktree back), so this is where a lost workspace surfaces.
 * 5. **Fire.**
 *
 * A run that fires early (`now` before `scheduledFor`) is simply on time.
 */
export const decideScheduledPlanRunFire = (params: {
  readonly hasActiveRun: boolean;
  readonly hasRunnableTasks: boolean;
  readonly now: Date;
  readonly scheduledFor: Date;
  /** Why the run's working directory is unusable, or null when it is usable (or the default). */
  readonly workspaceError: string | null;
}): ScheduledPlanRunFireDecision => {
  const { hasActiveRun, hasRunnableTasks, workspaceError, ...timing } = params;
  const timingDecision = decideScheduledPlanRunReproject(timing);

  if (timingDecision.kind === 'missed') {
    return timingDecision;
  }

  if (hasActiveRun) {
    return {
      kind: 'superseded',
      reason: 'the plan already had an active run',
    };
  }

  if (!hasRunnableTasks) {
    return {
      kind: 'nothing_to_run',
      reason: 'the plan had no tasks left to run',
    };
  }

  if (workspaceError !== null) {
    return { kind: 'workspace_missing', reason: workspaceError };
  }

  return { kind: 'fire' };
};
