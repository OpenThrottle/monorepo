import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlanStatusService } from '../../graphql/plans/plan-status.service.ts';
import type { StatusChangeSystemAccountService } from '../../graphql/work-ledger/status-change-system-account.service.ts';
import type { WorkLedgerCaptureService } from '../../graphql/work-ledger/work-ledger-capture.service.ts';
import { PlanRunsStaleSweepProcessor } from './plan-runs-stale-sweep.processor.ts';
import type { PlanRunsStaleSweepJob } from './plan-runs-stale-sweep.types.ts';

/** Minimal stale-run fixture (only the fields the processor reads). */
const staleRun = (id: string, planId: string): PlanRun =>
  createMock<PlanRun>({ id, planId, status: 'IN_PROGRESS' });

/** An unsupervised run: no timer, so it is judged on age rather than silence. */
const unsupervisedRun = (id: string, planId: string): PlanRun =>
  createMock<PlanRun>({
    heartbeatExpected: false,
    id,
    planId,
    status: 'IN_PROGRESS',
  });

describe('PlanRunsStaleSweepProcessor', () => {
  let planRunsService: PlanRunsService;
  let plansService: PlansService;
  let planStatusService: PlanStatusService;
  let statusChangeSystemAccount: StatusChangeSystemAccountService;
  let tasksService: TasksService;
  let processor: PlanRunsStaleSweepProcessor;

  const findStaleInProgressRuns = vi.fn();
  const findStaleUnsupervisedRuns = vi.fn();
  const settleStaleRun = vi.fn();
  const findRecentByPlanId = vi.fn();
  // Bare (untyped) fns for the repo mocks so loose fixtures round-trip without casts.
  const planFindOne = vi.fn();
  // applyBulkTaskStatusChange's select-lock-update: getMany() drives which rows are "affected"
  // (and each row's real prior status, for the capture's `from`); execute() is the by-id update.
  const taskSelectGetMany = vi
    .fn()
    .mockResolvedValue([{ id: 'task-1', status: 'IN_PROGRESS' }]);
  const taskUpdateExecute = vi.fn().mockResolvedValue({ affected: 1 });
  const taskQueryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    execute: taskUpdateExecute,
    getMany: taskSelectGetMany,
    set: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  const taskRepoForManager = {
    createQueryBuilder: vi.fn(() => taskQueryBuilder),
  };
  const taskManagerTransaction = vi.fn(
    async (cb: (manager: unknown) => unknown) =>
      cb({ getRepository: () => taskRepoForManager }),
  );
  const mockRecordStatusChange = vi.fn().mockResolvedValue(undefined);
  // The plans.status write chokepoint, in place of the old direct planRepo.update. Its own
  // race/capture behaviour is covered by plan-status.service.test.ts; here it is mocked
  // wholesale and defaults to "applied" so the reconcile's task-reset + logging still exercise.
  const writeGuardedStatus = vi.fn().mockResolvedValue(true);
  const resolveStatusChangeSystemAccountId = vi
    .fn()
    .mockResolvedValue('status-change-system-account-id');
  const job = createMock<PlanRunsStaleSweepJob>({ id: 'sweep-1' });

  beforeEach(() => {
    findStaleInProgressRuns.mockReset().mockResolvedValue([]);
    findStaleUnsupervisedRuns.mockReset().mockResolvedValue([]);
    // settleStaleRun echoes a STALE row by default (successful settle).
    settleStaleRun
      .mockReset()
      .mockImplementation((id: string) =>
        Promise.resolve(createMock<PlanRun>({ id, status: 'STALE' })),
      );
    findRecentByPlanId.mockReset().mockResolvedValue([]);
    planFindOne
      .mockReset()
      .mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });
    taskSelectGetMany
      .mockReset()
      .mockResolvedValue([{ id: 'task-1', status: 'IN_PROGRESS' }]);
    taskUpdateExecute.mockReset().mockResolvedValue({ affected: 1 });
    taskManagerTransaction.mockClear();
    mockRecordStatusChange.mockReset().mockResolvedValue(undefined);
    writeGuardedStatus.mockReset().mockResolvedValue(true);
    resolveStatusChangeSystemAccountId
      .mockReset()
      .mockResolvedValue('status-change-system-account-id');

    planRunsService = createMock<PlanRunsService>({
      findRecentByPlanId,
      findStaleInProgressRuns,
      findStaleUnsupervisedRuns,
      settleStaleRun,
    });
    plansService = createMock<PlansService>({
      getRepository: () =>
        createMock<ReturnType<PlansService['getRepository']>>({
          findOne: planFindOne,
        }),
    });
    planStatusService = createMock<PlanStatusService>({
      writeGuardedStatus,
    });
    statusChangeSystemAccount = createMock<StatusChangeSystemAccountService>({
      resolveId: resolveStatusChangeSystemAccountId,
    });
    tasksService = createMock<TasksService>({
      getRepository: () =>
        createMock<ReturnType<TasksService['getRepository']>>({
          manager: createMock({ transaction: taskManagerTransaction }),
        }),
    });

    processor = new PlanRunsStaleSweepProcessor(
      createMock<LoggerService>(),
      planRunsService,
      plansService,
      planStatusService,
      statusChangeSystemAccount,
      tasksService,
      createMock<WorkLedgerCaptureService>({
        recordStatusChange: mockRecordStatusChange,
        resolveSessionId: vi.fn().mockResolvedValue('session-1'),
      }),
    );
  });

  it('no-ops when there are no stale runs', async () => {
    findStaleInProgressRuns.mockResolvedValue([]);

    await processor.process(job);

    expect(settleStaleRun).not.toHaveBeenCalled();
    expect(writeGuardedStatus).not.toHaveBeenCalled();
  });

  it('settles each stale run to STALE and resets a stranded plan (+ its IN_PROGRESS tasks) to PENDING', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    // No live run remains for the plan after the settle.
    findRecentByPlanId.mockResolvedValue([
      createMock<PlanRun>({ id: 'run-1', status: 'STALE' }),
    ]);

    await processor.process(job);

    expect(settleStaleRun).toHaveBeenCalledWith('run-1');
    // Routed through the applyStatusChange chokepoint (PlanStatusService.writeGuardedStatus),
    // attributed to the status-change-system service account, in place of the old bare
    // planRepo.update.
    expect(writeGuardedStatus).toHaveBeenCalledWith('plan-1', {
      actorKind: 'service_account',
      actorSub: 'status-change-system-account-id',
      captureFailureIsFatal: false,
      guardCurrentStatus: 'IN_PROGRESS',
      requestedStatus: 'PENDING',
      throwOnForbiddenInProgress: false,
    });
    // Select-lock-update-capture, in its own transaction: the plan's IN_PROGRESS tasks are
    // selected+locked, updated by id, and each row's own prior status ('IN_PROGRESS' here, per
    // taskSelectGetMany) is captured as `from` — attributed to the same status-change-system
    // account, non-fatal.
    expect(taskManagerTransaction).toHaveBeenCalledTimes(1);
    expect(taskQueryBuilder.where).toHaveBeenCalledWith(
      'task.plan_id = :planId',
      {
        planId: 'plan-1',
      },
    );
    expect(taskQueryBuilder.set).toHaveBeenCalledWith({ status: 'PENDING' });
    expect(taskUpdateExecute).toHaveBeenCalled();
    expect(mockRecordStatusChange).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorKind: 'service_account',
        actorSub: 'status-change-system-account-id',
        entity: 'task',
        from: 'IN_PROGRESS',
        planId: 'plan-1',
        taskId: 'task-1',
        to: 'PENDING',
      }),
    );
  });

  it('does NOT reset a plan that still has a live (IN_PROGRESS) run', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-old', 'plan-1')]);
    // A concurrent healthy run exists for the same plan.
    findRecentByPlanId.mockResolvedValue([
      createMock<PlanRun>({ id: 'run-live', status: 'IN_PROGRESS' }),
    ]);

    await processor.process(job);

    expect(settleStaleRun).toHaveBeenCalledWith('run-old');
    expect(writeGuardedStatus).not.toHaveBeenCalled();
    expect(taskManagerTransaction).not.toHaveBeenCalled();
  });

  it('does NOT reset a plan that is no longer IN_PROGRESS', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    planFindOne.mockResolvedValue({ id: 'plan-1', status: 'COMPLETED' });

    await processor.process(job);

    expect(writeGuardedStatus).not.toHaveBeenCalled();
  });

  it('reconciles each affected plan once even when it had several stale runs', async () => {
    findStaleInProgressRuns.mockResolvedValue([
      staleRun('run-1', 'plan-1'),
      staleRun('run-2', 'plan-1'),
    ]);
    findRecentByPlanId.mockResolvedValue([]);

    await processor.process(job);

    expect(settleStaleRun).toHaveBeenCalledTimes(2);
    // Both runs share plan-1 → reconcile runs once.
    expect(writeGuardedStatus).toHaveBeenCalledTimes(1);
  });

  it('does not reset the task when the chokepoint declines the write (raced off IN_PROGRESS under its own lock)', async () => {
    // writeGuardedStatus's own pessimistic-write lock re-check found the row no longer
    // IN_PROGRESS — a race the outer plan.status !== 'IN_PROGRESS' check above cannot see.
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    findRecentByPlanId.mockResolvedValue([]);
    writeGuardedStatus.mockResolvedValue(false);

    await processor.process(job);

    expect(writeGuardedStatus).toHaveBeenCalledTimes(1);
    expect(taskManagerTransaction).not.toHaveBeenCalled();
  });

  it('settles an over-age unsupervised run and NEVER touches plan or task status', async () => {
    // This is the load-bearing invariant of migration 110: nothing may reset a plan or its
    // tasks to PENDING on the strength of a missing heartbeat. An unsupervised run has no
    // heartbeat by construction, so sweeping one must settle the RUN ROW and stop there —
    // even though the plan is IN_PROGRESS and has no other live run, which is exactly the
    // shape that WOULD trigger a reset on the heartbeating path.
    findStaleUnsupervisedRuns.mockResolvedValue([
      unsupervisedRun('run-abandoned', 'plan-1'),
    ]);
    findRecentByPlanId.mockResolvedValue([]);
    planFindOne.mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });

    await processor.process(job);

    expect(settleStaleRun).toHaveBeenCalledWith('run-abandoned');
    expect(writeGuardedStatus).not.toHaveBeenCalled();
    expect(taskManagerTransaction).not.toHaveBeenCalled();
  });

  it('sweeps unsupervised runs on the 12h cutoff, not the 120s one', async () => {
    // Passing STALE_CUTOFF_MS here would sweep every healthy interactive loop two minutes in.
    let unsupervisedCutoff: Date | undefined;
    let heartbeatCutoff: Date | undefined;
    findStaleUnsupervisedRuns.mockImplementation((cutoff: Date) => {
      unsupervisedCutoff = cutoff;

      return Promise.resolve([]);
    });
    findStaleInProgressRuns.mockImplementation((cutoff: Date) => {
      heartbeatCutoff = cutoff;

      return Promise.resolve([]);
    });

    await processor.process(job);

    expect(unsupervisedCutoff).toBeInstanceOf(Date);
    expect(heartbeatCutoff).toBeInstanceOf(Date);
    const unsupervisedAgeMs = Date.now() - (unsupervisedCutoff?.getTime() ?? 0);
    expect(unsupervisedAgeMs).toBeGreaterThan(11 * 60 * 60 * 1_000);
    // Strictly further back than the heartbeating pass's cutoff.
    expect(unsupervisedCutoff?.getTime() ?? 0).toBeLessThan(
      heartbeatCutoff?.getTime() ?? 0,
    );
  });

  it('reconciles a heartbeating stale run even when an unsupervised run is swept alongside it', async () => {
    // The two passes are independent: the unsupervised pass must neither suppress the
    // heartbeating pass's reconcile nor contribute a plan id to it.
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    findStaleUnsupervisedRuns.mockResolvedValue([
      unsupervisedRun('run-abandoned', 'plan-2'),
    ]);
    findRecentByPlanId.mockResolvedValue([]);

    await processor.process(job);

    expect(writeGuardedStatus).toHaveBeenCalledTimes(1);
    expect(writeGuardedStatus).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({
        guardCurrentStatus: 'IN_PROGRESS',
        requestedStatus: 'PENDING',
      }),
    );
  });

  it('skips reconcile for a run whose status-guarded settle was a no-op (already terminal)', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    // A graceful settle won the race: settleStaleRun returns a non-STALE row.
    settleStaleRun.mockResolvedValue(
      createMock<PlanRun>({ id: 'run-1', status: 'COMPLETED' }),
    );

    await processor.process(job);

    expect(planFindOne).not.toHaveBeenCalled();
    expect(writeGuardedStatus).not.toHaveBeenCalled();
  });
});
