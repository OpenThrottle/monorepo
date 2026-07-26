import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanRunsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import { PlanRunsStaleSweepProcessor } from './plan-runs-stale-sweep.processor';
import type { PlanRunsStaleSweepJob } from './plan-runs-stale-sweep.types';

/** Minimal stale-run fixture (only the fields the processor reads). */
const staleRun = (id: string, planId: string): PlanRun =>
  createMock<PlanRun>({ id, planId, status: 'IN_PROGRESS' });

describe('PlanRunsStaleSweepProcessor', () => {
  let planRunsService: PlanRunsService;
  let plansService: PlansService;
  let tasksService: TasksService;
  let processor: PlanRunsStaleSweepProcessor;

  const findStaleInProgressRuns = vi.fn();
  const settleStaleRun = vi.fn();
  const findRecentByPlanId = vi.fn();
  // Bare (untyped) fns for the repo mocks so loose fixtures round-trip without casts.
  const planFindOne = vi.fn();
  const planUpdate = vi.fn().mockResolvedValue({ affected: 1 });
  const taskUpdate = vi.fn().mockResolvedValue({ affected: 1 });
  const job = createMock<PlanRunsStaleSweepJob>({ id: 'sweep-1' });

  beforeEach(() => {
    findStaleInProgressRuns.mockReset().mockResolvedValue([]);
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
