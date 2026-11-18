import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PLAN_RUN_STATUS } from './plan-runs.constants.ts';
import { createPlanRunsRepositoryMock } from './plan-runs.utils.ts';

describe('createPlanRunsRepositoryMock', () => {
  it('starts as an empty plan_runs table', async () => {
    const repository = createPlanRunsRepositoryMock();

    await expect(repository.findRunById('a')).resolves.toBeNull();
    await expect(repository.findRecentByPlanId('p', 5)).resolves.toEqual([]);
    await expect(repository.readCancelRequested('p')).resolves.toBeNull();
    await expect(repository.hasActiveRun('p', 'r')).resolves.toBe(false);
    await expect(
      repository.findPlanIdsWithLiveDetachedRun(['p']),
    ).resolves.toEqual(new Set());
  });

  it('resolves the inserted row with its input for the two inserts', async () => {
    const repository = createPlanRunsRepositoryMock();

    await expect(
      repository.recordQueuedRun({
        bullmqJobId: 'job-1',
        executionBackend: 'claude',
        planId: 'plan-1',
        queueName: 'plans',
        runKind: 'orchestrator',
      }),
    ).resolves.toMatchObject({
      bullmqJobId: 'job-1',
      planId: 'plan-1',
      status: PLAN_RUN_STATUS.QUEUED,
    });
    await expect(
      repository.registerCliRun({
        executionBackend: 'claude',
        heartbeatExpected: false,
        hostname: 'host',
        pid: 1,
        planId: 'plan-1',
        workerId: null,
      }),
    ).resolves.toMatchObject({
      bullmqJobId: null,
      heartbeatExpected: false,
      status: PLAN_RUN_STATUS.IN_PROGRESS,
    });
  });

  it('names the plan_runs table in inherited not-found errors', async () => {
    const repository = createPlanRunsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'plan_runs record with ID "a" not found',
    );
  });
});
