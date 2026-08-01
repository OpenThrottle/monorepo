import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { Queue } from 'bullmq';
import type { ScheduledAgentJob } from '@openthrottle/nestjs-repositories';
import {
  buildScheduledAgentJobPayload,
  ScheduledAgentJobSchedulerService,
} from './scheduled-agent-job-scheduler.service';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types';

const makeJob = (
  overrides: Partial<ScheduledAgentJob> = {},
): ScheduledAgentJob =>
  createMock<ScheduledAgentJob>({
    cronPattern: '0 9 * * *',
    cwd: null,
    driverId: 'claude',
    id: 'job-1',
    model: 'opus',
    prompt: 'audit deps',
    schedulerKey: 'scheduled-job:job-1',
    settings: {},
    timeoutMs: null,
    timezone: 'America/Los_Angeles',
    ...overrides,
  });

describe('ScheduledAgentJobSchedulerService', () => {
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let service: ScheduledAgentJobSchedulerService;

  beforeEach(() => {
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      getJobScheduler: vi.fn().mockResolvedValue(undefined),
      getJobSchedulers: vi.fn().mockResolvedValue([]),
      removeJobScheduler: vi.fn().mockResolvedValue(true),
      upsertJobScheduler: vi.fn().mockResolvedValue({}),
    });
    service = new ScheduledAgentJobSchedulerService(queue);
  });

  it('builds a run snapshot with no runId (scheduled fire creates its own row)', () => {
    const payload = buildScheduledAgentJobPayload(makeJob());
    expect(payload).toEqual({
      cwd: null,
      driverId: 'claude',
      model: 'opus',
      prompt: 'audit deps',
      scheduleId: 'job-1',
      settings: {},
      timeoutMs: null,
    });
    expect('runId' in payload).toBe(false);
  });

  it('upserts a scheduler keyed by schedulerKey with pattern + tz and reads back next run', async () => {
    const nextMs = Date.UTC(2026, 6, 1, 16, 0, 0);
    vi.mocked(queue.getJobScheduler).mockResolvedValue({
      key: 'scheduled-job:job-1',
      name: 'scheduled-agent-job',
      next: nextMs,
    });

    const next = await service.upsertScheduler(makeJob());

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      { pattern: '0 9 * * *', tz: 'America/Los_Angeles' },
      expect.objectContaining({
        data: expect.objectContaining({ scheduleId: 'job-1' }),
        name: 'scheduled-agent-job',
        opts: expect.objectContaining({ attempts: 1 }),
      }),
    );
    expect(next).toEqual(new Date(nextMs));
  });

  it('omits tz when the schedule has no timezone', async () => {
    await service.upsertScheduler(makeJob({ timezone: null }));
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      { pattern: '0 9 * * *' },
      expect.anything(),
    );
  });

  it('removeScheduler delegates to removeJobScheduler', async () => {
    await service.removeScheduler('scheduled-job:job-1');
    expect(queue.removeJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
    );
  });

  it('lists only owned (scheduled-job:*) scheduler ids', async () => {
    vi.mocked(queue.getJobSchedulers).mockResolvedValue([
      { id: 'scheduled-job:a', key: 'k1', name: 'n' },
      { id: 'database-backup', key: 'k2', name: 'n' },
      { id: 'scheduled-job:b', key: 'k3', name: 'n' },
    ]);

    expect(await service.listOwnedSchedulerIds()).toEqual([
      'scheduled-job:a',
      'scheduled-job:b',
    ]);
  });
});
