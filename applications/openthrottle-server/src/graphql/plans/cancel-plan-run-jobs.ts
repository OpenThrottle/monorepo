/**
 * @description Finds BullMQ plan Ralph jobs (spawn and orchestrator job names) for a OpenThrottle plan id and
 * removes non-active jobs. Active (locked) jobs cannot be removed from outside the worker; callers should
 * surface those ids separately.
 */

import type { JobType } from 'bullmq';
import type { Queue } from 'bullmq';
import { isPlanRalphBullJobName } from '../../queues/plans/plans.constants';
import type { RunPlanJobData } from '../../queues/plans/plans.types';

const PLAN_RUN_SCAN_STATES: readonly JobType[] = [
  'waiting',
  'delayed',
  'paused',
  'active',
  'prioritized',
];

interface CancelPlanRunJobsResult {
  /** BullMQ job ids that were active/locked and could not be removed without worker cooperation. */
  readonly lockedActiveJobIds: readonly string[];
  /** Number of plan Ralph jobs whose payload matched `planId` (before removal attempts). */
  readonly matchingJobCount: number;
  /** BullMQ job ids successfully removed (waiting, delayed, paused, prioritized). */
  readonly removedJobIds: readonly string[];
}

/**
 * @description Removes queued or delayed plan-run jobs for `planId`. Active jobs remain; their ids are listed in `lockedActiveJobIds`.
 */
export const cancelPlanRunJobsForPlan = async (
  queue: Queue<RunPlanJobData, void>,
  planId: string,
): Promise<CancelPlanRunJobsResult> => {
  const jobs = await queue.getJobs([...PLAN_RUN_SCAN_STATES], 0, 1000);
  const matching = jobs.filter(
    (j) =>
      isPlanRalphBullJobName(j.name) &&
      typeof j.data?.planId === 'string' &&
      j.data.planId === planId,
  );

  const outcomes = await Promise.all(
    matching.map(async (job) => {
      const id = job.id != null ? String(job.id) : '';
      try {
        await job.remove();
        return { id, kind: 'removed' as const };
      } catch {
        const state = await job.getState();
        if (state === 'active' && id !== '') {
          return { id, kind: 'lockedActive' as const };
        }
        return { id: '', kind: 'skipped' as const };
      }
    }),
  );

  const removedJobIds = outcomes
    .filter((o) => o.kind === 'removed' && o.id !== '')
    .map((o) => o.id);
  const lockedActiveJobIds = outcomes
    .filter((o) => o.kind === 'lockedActive')
    .map((o) => o.id);

  return {
    lockedActiveJobIds,
    matchingJobCount: matching.length,
    removedJobIds,
  };
};
