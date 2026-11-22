import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunsRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createPlanRunsRepositoryMock,
  planRunsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { Job, Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_RUN_ADVANCE_JOB_NAME } from '../project-runs.constants.ts';
import { ProjectRunsEnqueueService } from './enqueue.service.ts';

describe('ProjectRunsEnqueueService', () => {
  const add = vi.fn(async () => createMock<Job>());
  const warn = vi.fn();
  const planRuns = createPlanRunsRepositoryMock();
  let service: ProjectRunsEnqueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    planRuns.findOne.mockResolvedValue(null);
    service = new ProjectRunsEnqueueService(
      createMock<LoggerService>({ warn }),
      createMock<PlanRunsRepository>(planRuns),
      createMock<Queue>({ add }),
    );
  });

  describe('enqueueAdvanceForPlanRun', () => {
    it('enqueues an advance deduped on (project run, plan run, status)', async () => {
      const run = planRunsFactory.build({
        id: 'run-1',
        projectRunId: 'pr-1',
        status: 'COMPLETED',
      });

      await service.enqueueAdvanceForPlanRun(run);

      expect(add).toHaveBeenCalledWith(
        PROJECT_RUN_ADVANCE_JOB_NAME,
        { kind: 'advance', projectRunId: 'pr-1' },
        { jobId: 'project-run-advance-pr-1-run-1-COMPLETED' },
      );
    });

    it('enqueues nothing for a plan run no project run started', async () => {
      await service.enqueueAdvanceForPlanRun(
        planRunsFactory.build({ projectRunId: null }),
      );
      await service.enqueueAdvanceForPlanRun(null);

      expect(add).not.toHaveBeenCalled();
    });

    it('swallows a failed enqueue, so the settle never fails on Redis', async () => {
      add.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        service.enqueueAdvanceForPlanRun(
          planRunsFactory.build({ projectRunId: 'pr-1' }),
        ),
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('enqueueAdvanceForJob', () => {
    it('looks the run up by its job key and advances its project run', async () => {
      planRuns.findOne.mockResolvedValue(
        planRunsFactory.build({ projectRunId: 'pr-1' }),
      );

      await service.enqueueAdvanceForJob('plans', 'job-1');

      expect(planRuns.findOne).toHaveBeenCalledWith({
        where: { bullmqJobId: 'job-1', queueName: 'plans' },
      });
      expect(add).toHaveBeenCalledTimes(1);
    });

    it('never throws when the lookup fails', async () => {
      planRuns.findOne.mockRejectedValue(new Error('db down'));

      await expect(
        service.enqueueAdvanceForJob('plans', 'job-1'),
      ).resolves.toBeUndefined();
      expect(add).not.toHaveBeenCalled();
    });
  });
});
