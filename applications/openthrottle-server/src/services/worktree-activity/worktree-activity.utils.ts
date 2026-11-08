import type { PlanRun } from '@openthrottle/nestjs-repositories';

import type { DiscoveredWorktree } from '../worktree-discovery/worktree-discovery.types.ts';
import { WORKTREE_ACTIVITY } from './worktree-activity.constants.ts';
import type { ClassifiedWorktree } from './worktree-activity.types.ts';
/**
 * @description The classification itself, as a pure function of the discovered git signals plus the
 * live run (if any), so the precedence reads in one place.
 */
export const classifyWorktree = (
  worktree: DiscoveredWorktree,
  liveRun: PlanRun | null,
): ClassifiedWorktree => {
  const unregistered = worktree.checkoutId === null;

  if (liveRun !== null) {
    return {
      ...worktree,
      activity: WORKTREE_ACTIVITY.RUNNING,
      planId: liveRun.planId,
      planRunId: liveRun.id,
      runMonitored: liveRun.heartbeatExpected,
      unregistered,
    };
  }

  // A failed status probe (dirty === null) is not evidence of cleanliness, but IDLE is still the
  // honest reading: nothing observed says otherwise, and the probe failure is already a warning.
  const hasUncommitted = worktree.dirty === true;
  const isAhead = (worktree.aheadCount ?? 0) > 0;

  const isDirty = hasUncommitted || isAhead;
  const activity = isDirty ? WORKTREE_ACTIVITY.DIRTY : WORKTREE_ACTIVITY.IDLE;

  return {
    ...worktree,
    activity,
    planId: null,
    planRunId: null,
    runMonitored: null,
    unregistered,
  };
};
