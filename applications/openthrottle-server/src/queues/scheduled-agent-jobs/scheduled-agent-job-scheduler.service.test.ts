import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { Queue } from 'bullmq';
import {
  ScheduledAgentJobCheckoutPathService,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
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
    ownerUserId: 'user-1',
    prompt: 'audit deps',
    repositoryCheckoutId: null,
    schedulerKey: 'scheduled-job:job-1',
    settings: {},
    timeoutMs: null,
    timezone: 'America/Los_Angeles',
    ...overrides,
  });

describe('ScheduledAgentJobSchedulerService', () => {
  let checkoutPaths: ScheduledAgentJobCheckoutPathService;
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let service: ScheduledAgentJobSchedulerService;

  beforeEach(() => {
    checkoutPaths = createMock<ScheduledAgentJobCheckoutPathService>({
      resolve: vi.fn().mockResolvedValue({ path: '/repos/monorepo' }),
    });
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      getJobScheduler: vi.fn().mockResolvedValue(undefined),
      getJobSchedulers: vi.fn().mockResolvedValue([]),
      removeJobScheduler: vi.fn().mockResolvedValue(true),
      upsertJobScheduler: vi.fn().mockResolvedValue({}),
    });
    service = new ScheduledAgentJobSchedulerService(checkoutPaths, queue);
  });

  it('builds a run snapshot with no runId (scheduled fire creates its own row)', () => {
    const payload = buildScheduledAgentJobPayload(makeJob());
    expect(payload).toEqual({
      cwd: null,
      driverId: 'claude',
      model: 'opus',
      prompt: 'audit deps',
      repositoryCheckoutId: null,
      scheduleId: 'job-1',
      settings: {},
      timeoutMs: null,
    });
    expect('runId' in payload).toBe(false);
  });

  it('snapshots the resolved checkout path as the payload cwd, keeping the checkout id', () => {
    const payload = buildScheduledAgentJobPayload(
      makeJob({ repositoryCheckoutId: 'checkout-1' }),
      '/repos/monorepo',
    );
    expect(payload.cwd).toBe('/repos/monorepo');
    expect(payload.repositoryCheckoutId).toBe('checkout-1');
  });

  it('leaves the legacy explicit cwd in place when no checkout is targeted', () => {
    const payload = buildScheduledAgentJobPayload(
      makeJob({ cwd: '/legacy/path' }),
      null,
    );
    expect(payload.cwd).toBe('/legacy/path');
    expect(payload.repositoryCheckoutId).toBeNull();
  });

  it('resolves the targeted checkout for the schedule owner when upserting', async () => {
    await service.upsertScheduler(
      makeJob({ ownerUserId: 'user-1', repositoryCheckoutId: 'checkout-1' }),
    );

    expect(checkoutPaths.resolve).toHaveBeenCalledWith({
      checkoutId: 'checkout-1',
      ownerUserId: 'user-1',
    });
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          cwd: '/repos/monorepo',
          repositoryCheckoutId: 'checkout-1',
        }),
      }),
    );
  });

  it('does not resolve a checkout for a schedule that targets none', async () => {
    await service.upsertScheduler(makeJob({ repositoryCheckoutId: null }));
    expect(checkoutPaths.resolve).not.toHaveBeenCalled();
  });

  it('falls back to the legacy cwd when the targeted checkout no longer resolves', async () => {
    vi.mocked(checkoutPaths.resolve).mockResolvedValue({ error: 'not-found' });

    await service.upsertScheduler(
      makeJob({ cwd: '/legacy/path', repositoryCheckoutId: 'gone' }),
    );

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      'scheduled-job:job-1',
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({ cwd: '/legacy/path' }),
      }),
    );
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
