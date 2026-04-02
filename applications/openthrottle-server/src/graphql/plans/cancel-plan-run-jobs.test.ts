import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, test, vi } from 'vitest';
import type { Queue } from 'bullmq';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
import {
  PLAN_RUN_JOB_NAME,
  cancelPlanRunJobsForPlan,
} from './cancel-plan-run-jobs';

describe('cancelPlanRunJobsForPlan', () => {
  test('returns empty when no jobs match plan id', async () => {
    const getJobs = vi.fn().mockResolvedValue([]);
    const queue = createMock<Queue<RunPlanJobData, void>>({
      getJobs,
    });

    const result = await cancelPlanRunJobsForPlan(queue, 'plan-1');

    expect(result.matchingJobCount).toBe(0);
    expect(result.removedJobIds).toEqual([]);
    expect(result.lockedActiveJobIds).toEqual([]);
  });

  test('removes waiting run-plan job and records id', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const job = {
      data: { planId: 'plan-1' },
      id: 'j1',
      name: PLAN_RUN_JOB_NAME,
      remove,
    };
    const getJobs = vi.fn().mockResolvedValue([job]);
    const queue = createMock<Queue<RunPlanJobData, void>>({
      getJobs,
    });

    const result = await cancelPlanRunJobsForPlan(queue, 'plan-1');

    expect(remove).toHaveBeenCalledOnce();
    expect(result.removedJobIds).toEqual(['j1']);
    expect(result.lockedActiveJobIds).toEqual([]);
    expect(result.matchingJobCount).toBe(1);
  });

  test('ignores jobs with different name or plan id', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const getJobs = vi.fn().mockResolvedValue([
      {
        data: { planId: 'other' },
        id: 'x',
        name: PLAN_RUN_JOB_NAME,
        remove,
      },
      {
        data: { planId: 'plan-1' },
        id: 'y',
        name: 'other-job',
        remove,
      },
    ]);
    const queue = createMock<Queue<RunPlanJobData, void>>({ getJobs });

    const result = await cancelPlanRunJobsForPlan(queue, 'plan-1');

    expect(remove).not.toHaveBeenCalled();
    expect(result.matchingJobCount).toBe(0);
  });

  test('records locked active job when remove throws', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('locked'));
    const getState = vi.fn().mockResolvedValue('active');
    const job = {
      data: { planId: 'plan-1' },
      getState,
      id: 'j-active',
      name: PLAN_RUN_JOB_NAME,
      remove,
    };
    const getJobs = vi.fn().mockResolvedValue([job]);
    const queue = createMock<Queue<RunPlanJobData, void>>({ getJobs });

    const result = await cancelPlanRunJobsForPlan(queue, 'plan-1');

    expect(result.removedJobIds).toEqual([]);
    expect(result.lockedActiveJobIds).toEqual(['j-active']);
    expect(getState).toHaveBeenCalledOnce();
  });
});
