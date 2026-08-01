import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ScheduledAgentJobsService,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service';
import { ScheduledAgentJobsReconcileService } from './scheduled-agent-jobs-reconcile.service';

const job = (id: string): ScheduledAgentJob =>
  createMock<ScheduledAgentJob>({ id, schedulerKey: `scheduled-job:${id}` });

describe('ScheduledAgentJobsReconcileService', () => {
  let jobsService: ScheduledAgentJobsService;
  let scheduler: ScheduledAgentJobSchedulerService;
  let service: ScheduledAgentJobsReconcileService;

  beforeEach(() => {
    jobsService = createMock<ScheduledAgentJobsService>({
      listEnabledJobs: vi.fn().mockResolvedValue([]),
      updateNextRunAt: vi.fn().mockResolvedValue(undefined),
    });
    scheduler = createMock<ScheduledAgentJobSchedulerService>({
      listOwnedSchedulerIds: vi.fn().mockResolvedValue([]),
      removeScheduler: vi.fn().mockResolvedValue(undefined),
      upsertScheduler: vi
        .fn()
        .mockResolvedValue(new Date('2026-07-01T00:00:00Z')),
    });
    service = new ScheduledAgentJobsReconcileService(
      createMock<LoggerService>(),
      jobsService,
      scheduler,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('upserts each enabled schedule, stores next run, and removes orphans', async () => {
    vi.mocked(jobsService.listEnabledJobs).mockResolvedValue([
      job('a'),
      job('b'),
    ]);
    vi.mocked(scheduler.listOwnedSchedulerIds).mockResolvedValue([
      'scheduled-job:a',
      'scheduled-job:b',
      'scheduled-job:stale', // no enabled row → orphan
    ]);

    await service.reconcile();

    expect(scheduler.upsertScheduler).toHaveBeenCalledTimes(2);
    expect(jobsService.updateNextRunAt).toHaveBeenCalledWith(
      'a',
      new Date('2026-07-01T00:00:00Z'),
    );
    expect(scheduler.removeScheduler).toHaveBeenCalledExactlyOnceWith(
      'scheduled-job:stale',
    );
  });

  it('onModuleInit runs reconcile when this checkout is the boot owner', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'true');
    const spy = vi.spyOn(service, 'reconcile').mockResolvedValue();

    await service.onModuleInit();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('onModuleInit skips reconcile when this checkout is not the boot owner', async () => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', 'false');
    const spy = vi.spyOn(service, 'reconcile').mockResolvedValue();

    await service.onModuleInit();

    expect(spy).not.toHaveBeenCalled();
  });
});
