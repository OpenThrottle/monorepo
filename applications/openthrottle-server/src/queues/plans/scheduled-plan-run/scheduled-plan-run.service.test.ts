import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanOutputStreamService,
  PlanRun,
  PlanRunsService,
} from '@openthrottle/nestjs-repositories';
import type { Job, Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanEnqueueService } from '../../../graphql/plans/plan-enqueue/plan-enqueue.service.ts';
import type { StatusChangeSystemAccountService } from '../../../graphql/work-ledger/status-change-system-account/status-change-system-account.service.ts';
import type { NotificationsService } from '../../../notifications/notifications.service.ts';
import type { PlanRunJobResult, RunPlanJobData } from '../plans.types.ts';
import { ScheduledPlanRunService } from './scheduled-plan-run.service.ts';

// A fixed clock for every lateness decision below.
const NOW = new Date('2026-11-01T12:00:00.000Z');
const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;

const scheduledRun = (
  id: string,
  scheduledFor: Date,
  overrides: Partial<PlanRun> = {},
): PlanRun => {
  return createMock<PlanRun>({
    bullmqJobId: `scheduled-plan-run-${id}`,
    id,
    planId: `plan-${id}`,
    scheduledFor,
    status: 'SCHEDULED',
    ...overrides,
  });
};

describe('ScheduledPlanRunService', () => {
  const mockEmitQueueJobCompleted = vi.fn();
  const mockFireScheduledRun = vi.fn();
  const mockReprojectScheduledRun = vi.fn();
  const mockReleaseScheduledPlan = vi.fn();
  const mockFindScheduledRunsWithJob = vi.fn();
  const mockTransitionScheduledRun = vi.fn();
  const mockGetJob = vi.fn();
  const mockOutputCreate = vi.fn((chunk: object) => chunk);
  const mockOutputSave = vi.fn();

  const service = new ScheduledPlanRunService(
    createMock<LoggerService>(),
    createMock<NotificationsService>({
      emitQueueJobCompleted: mockEmitQueueJobCompleted,
    }),
    createMock<PlanEnqueueService>({
      fireScheduledRun: mockFireScheduledRun,
      releaseScheduledPlan: mockReleaseScheduledPlan,
      reprojectScheduledRun: mockReprojectScheduledRun,
    }),
    createMock<PlanOutputStreamService>({
      getRepository: vi.fn().mockReturnValue({
        create: mockOutputCreate,
        save: mockOutputSave,
      }),
    }),
    createMock<PlanRunsService>({
      findScheduledRunsWithJob: mockFindScheduledRunsWithJob,
      transitionScheduledRun: mockTransitionScheduledRun,
    }),
    createMock<Queue<RunPlanJobData, PlanRunJobResult | void>>({
      getJob: mockGetJob,
    }),
    createMock<StatusChangeSystemAccountService>({
      resolveId: vi.fn().mockResolvedValue('system-account-id'),
    }),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockFireScheduledRun.mockResolvedValue({ kind: 'fire' });
    mockReprojectScheduledRun.mockResolvedValue({ jobId: 'job' });
    mockReleaseScheduledPlan.mockResolvedValue(true);
    mockFindScheduledRunsWithJob.mockResolvedValue([]);
    mockTransitionScheduledRun.mockResolvedValue(true);
    mockGetJob.mockResolvedValue(undefined);
    mockOutputSave.mockResolvedValue(undefined);
  });

  describe('fire', () => {
    const run = scheduledRun('a', NOW);

    it('applies the policy as the status-change system account, at the given instant', async () => {
      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockFireScheduledRun).toHaveBeenCalledWith({
        actorKind: 'service_account',
        actorSub: 'system-account-id',
        now: NOW,
        planId: 'plan-a',
        planRunId: 'a',
        workspaceError: null,
      });
    });

    it('passes a usable working directory through as no workspace error', async () => {
      await service.fire({ now: NOW, run, workingDirectory: tmpdir() });

      expect(mockFireScheduledRun).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceError: null }),
      );
    });

    it('reports a working directory removed since scheduling as a workspace error', async () => {
      const gone = join(tmpdir(), `ot-gone-worktree-${process.pid}-missing`);

      await service.fire({ now: NOW, run, workingDirectory: gone });

      expect(mockFireScheduledRun).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceError: `workingDirectory does not exist: ${gone}`,
        }),
      );
    });

    it('workspace missing: warns the user that the run could not start and why', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'workspace_missing',
        reason: 'workingDirectory does not exist: /gone/worktree',
      });

      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: `Scheduled plan run failed to start at 2026-11-01T12:00:00.000Z: workingDirectory does not exist: /gone/worktree. Its worktree was likely removed while the run waited; schedule it again on an existing checkout.`,
        planId: 'plan-a',
        severity: 'warning',
      });
    });

    it('fire: lets the run go on without notifying', async () => {
      expect(
        await service.fire({ now: NOW, run, workingDirectory: undefined }),
      ).toEqual({ kind: 'fire' });
      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
    });

    it('missed: warns the user with the reason and the scheduled instant', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'missed',
        reason: 'it was 75 minutes late, past the 60-minute grace window',
      });

      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: `Scheduled plan run missed: it was due at 2026-11-01T12:00:00.000Z and it was 75 minutes late, past the 60-minute grace window, so it was not started.`,
        planId: 'plan-a',
        severity: 'warning',
      });
    });

    it('superseded: warns the user, distinctly from missed', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'superseded',
        reason: 'the plan already had an active run',
      });

      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: `Scheduled plan run superseded: the plan already had an active run at 2026-11-01T12:00:00.000Z, so the scheduled run was not started.`,
        planId: 'plan-a',
        severity: 'warning',
      });
    });

    it('nothing to run: informs the user', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'nothing_to_run',
        reason: 'the plan had no tasks left to run',
      });

      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'info' }),
      );
    });

    it('nothing to run: appends the same line to the plan output stream', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'nothing_to_run',
        reason: 'the plan had no tasks left to run',
      });

      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockOutputSave).toHaveBeenCalledWith({
        content: `Scheduled plan run skipped: the plan had no tasks left to run at 2026-11-01T12:00:00.000Z.`,
        iteration: null,
        planId: 'plan-a',
      });
    });

    it('a failed output append is swallowed: the settle still reports its outcome and notifies', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({
        kind: 'nothing_to_run',
        reason: 'the plan had no tasks left to run',
      });
      mockOutputSave.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.fire({ now: NOW, run, workingDirectory: undefined }),
      ).resolves.toEqual({
        kind: 'nothing_to_run',
        reason: 'the plan had no tasks left to run',
      });
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledTimes(1);
    });

    it('fire and not_scheduled append nothing to the plan output', async () => {
      await service.fire({ now: NOW, run, workingDirectory: undefined });
      mockFireScheduledRun.mockResolvedValueOnce({ kind: 'not_scheduled' });
      await service.fire({ now: NOW, run, workingDirectory: undefined });

      expect(mockOutputSave).not.toHaveBeenCalled();
    });

    it('not_scheduled (a cancel won the race): no notification — the cancel was the user own action', async () => {
      mockFireScheduledRun.mockResolvedValueOnce({ kind: 'not_scheduled' });

      expect(
        await service.fire({ now: NOW, run, workingDirectory: undefined }),
      ).toEqual({
        kind: 'not_scheduled',
      });
      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
    });
  });

  describe('reconcileOnStartup', () => {
    it('leaves a run whose delayed job is still in BullMQ untouched', async () => {
      const run = scheduledRun('present', new Date(NOW.getTime() + HOUR_MS));
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);
      mockGetJob.mockResolvedValueOnce(createMock<Job>({ id: 'x' }));

      expect(await service.reconcileOnStartup(NOW)).toEqual(['job_present']);
      expect(mockGetJob).toHaveBeenCalledWith('scheduled-plan-run-present');
      expect(mockReprojectScheduledRun).not.toHaveBeenCalled();
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
    });

    it('re-enqueues a future run whose job is missing, with the time still left', async () => {
      const run = scheduledRun('future', new Date(NOW.getTime() + 3 * HOUR_MS));
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);

      expect(await service.reconcileOnStartup(NOW)).toEqual(['reprojected']);
      expect(mockReprojectScheduledRun).toHaveBeenCalledWith({
        delayMs: 3 * HOUR_MS,
        run,
      });
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
    });

    it('re-enqueues a due run inside the grace window immediately (delay 0)', async () => {
      const run = scheduledRun(
        'late',
        new Date(NOW.getTime() - 40 * MINUTE_MS),
      );
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);

      expect(await service.reconcileOnStartup(NOW)).toEqual(['reprojected']);
      expect(mockReprojectScheduledRun).toHaveBeenCalledWith({
        delayMs: 0,
        run,
      });
    });

    it('settles a run past the grace window MISSED and notifies, without re-enqueueing it', async () => {
      const run = scheduledRun('stale', new Date(NOW.getTime() - 2 * HOUR_MS));
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);

      expect(await service.reconcileOnStartup(NOW)).toEqual(['missed']);
      expect(mockTransitionScheduledRun).toHaveBeenCalledWith(
        'stale',
        'MISSED',
        undefined,
        expect.stringMatching(/\S/),
      );
      expect(mockOutputSave).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan-stale' }),
      );
      expect(mockReprojectScheduledRun).not.toHaveBeenCalled();
      // The plan held SCHEDULED only for this run: back to PENDING (D4).
      expect(mockReleaseScheduledPlan).toHaveBeenCalledWith('plan-stale', {
        actorKind: 'service_account',
        actorSub: 'system-account-id',
      });
      expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
        jobType: 'plans',
        message: expect.stringContaining('Scheduled plan run missed'),
        planId: 'plan-stale',
        severity: 'warning',
      });
    });

    it('does not notify when a cancel settled the row first', async () => {
      const run = scheduledRun('raced', new Date(NOW.getTime() - 2 * HOUR_MS));
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);
      mockTransitionScheduledRun.mockResolvedValueOnce(false);

      expect(await service.reconcileOnStartup(NOW)).toEqual([
        'settled_elsewhere',
      ]);
      expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
      expect(mockReleaseScheduledPlan).not.toHaveBeenCalled();
    });

    it('handles each run on its own: a failed re-projection is logged and left SCHEDULED, the rest proceed', async () => {
      const broken = scheduledRun('broken', new Date(NOW.getTime() + HOUR_MS));
      const fine = scheduledRun('fine', new Date(NOW.getTime() + HOUR_MS));
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([broken, fine]);
      mockReprojectScheduledRun
        .mockRejectedValueOnce(new Error('workingDirectory does not exist'))
        .mockResolvedValueOnce({ jobId: 'job' });

      expect(await service.reconcileOnStartup(NOW)).toEqual([
        'failed',
        'reprojected',
      ]);
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
    });

    it('never throws, so it cannot block the server from booting', async () => {
      mockFindScheduledRunsWithJob.mockRejectedValueOnce(new Error('db down'));

      await expect(service.reconcileOnStartup(NOW)).resolves.toEqual([]);
    });

    it('keeps live interactive plans out: it only ever touches the scheduled row and its job', async () => {
      // Candidates come only from rows with a BullMQ job id (findScheduledRunsWithJob), which an
      // interactive /ot-loop or detached CLI run never has. A scheduled run on a plan an interactive
      // loop is driving is re-projected as-is — no plan or task status is read or written here (this
      // service has no handle on either) — and the collision hold decides at fire time.
      const run = scheduledRun(
        'beside-loop',
        new Date(NOW.getTime() + HOUR_MS),
      );
      mockFindScheduledRunsWithJob.mockResolvedValueOnce([run]);

      await service.reconcileOnStartup(NOW);

      expect(mockFindScheduledRunsWithJob).toHaveBeenCalledWith(500);
      expect(mockReprojectScheduledRun).toHaveBeenCalledTimes(1);
      expect(mockFireScheduledRun).not.toHaveBeenCalled();
      expect(mockTransitionScheduledRun).not.toHaveBeenCalled();
    });
  });
});
