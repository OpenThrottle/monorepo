import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanRunsStaleSweepProcessor } from './plan-runs-stale-sweep.processor';
import type { PlanRunsStaleSweepJob } from './plan-runs-stale-sweep.types';

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
  let tasksService: TasksService;
  let processor: PlanRunsStaleSweepProcessor;

  const findStaleInProgressRuns = vi.fn();
  const findStaleUnsupervisedRuns = vi.fn();
  const settleStaleRun = vi.fn();
  const findRecentByPlanId = vi.fn();
  // Bare (untyped) fns for the repo mocks so loose fixtures round-trip without casts.
  const planFindOne = vi.fn();
  const planUpdate = vi.fn().mockResolvedValue({ affected: 1 });
  const taskUpdate = vi.fn().mockResolvedValue({ affected: 1 });
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
    planUpdate.mockClear();
    taskUpdate.mockClear();

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
          update: planUpdate,
        }),
    });
    tasksService = createMock<TasksService>({
      getRepository: () =>
        createMock<ReturnType<TasksService['getRepository']>>({
          update: taskUpdate,
        }),
    });

    processor = new PlanRunsStaleSweepProcessor(
      createMock<LoggerService>(),
      planRunsService,
      plansService,
      tasksService,
    );
  });

  it('no-ops when there are no stale runs', async () => {
    findStaleInProgressRuns.mockResolvedValue([]);

    await processor.process(job);

    expect(settleStaleRun).not.toHaveBeenCalled();
    expect(planUpdate).not.toHaveBeenCalled();
  });

  it('settles each stale run to STALE and resets a stranded plan (+ its IN_PROGRESS tasks) to PENDING', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    // No live run remains for the plan after the settle.
    findRecentByPlanId.mockResolvedValue([
      createMock<PlanRun>({ id: 'run-1', status: 'STALE' }),
    ]);

    await processor.process(job);

    expect(settleStaleRun).toHaveBeenCalledWith('run-1');
    expect(planUpdate).toHaveBeenCalledWith(
      { id: 'plan-1' },
      { status: 'PENDING' },
    );
    expect(taskUpdate).toHaveBeenCalledWith(
      { planId: 'plan-1', status: 'IN_PROGRESS' },
      { status: 'PENDING' },
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
    expect(planUpdate).not.toHaveBeenCalled();
    expect(taskUpdate).not.toHaveBeenCalled();
  });

  it('does NOT reset a plan that is no longer IN_PROGRESS', async () => {
    findStaleInProgressRuns.mockResolvedValue([staleRun('run-1', 'plan-1')]);
    planFindOne.mockResolvedValue({ id: 'plan-1', status: 'COMPLETED' });

    await processor.process(job);

    expect(planUpdate).not.toHaveBeenCalled();
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
    expect(planUpdate).toHaveBeenCalledTimes(1);
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
    expect(planUpdate).not.toHaveBeenCalled();
    expect(taskUpdate).not.toHaveBeenCalled();
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

    expect(planUpdate).toHaveBeenCalledTimes(1);
    expect(planUpdate).toHaveBeenCalledWith(
      { id: 'plan-1' },
      { status: 'PENDING' },
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
    expect(planUpdate).not.toHaveBeenCalled();
  });
});
