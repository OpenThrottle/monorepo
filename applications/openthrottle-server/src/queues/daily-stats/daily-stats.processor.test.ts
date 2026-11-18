import { createMock } from '@golevelup/ts-vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  DailyStatsRepository,
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { DailyStatsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createDailyStatsRepositoryMock,
  dailyStatsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import { DailyStatsProcessor } from './daily-stats.processor.ts';
import type { AggregateDailyStatsJob } from './daily-stats.types.ts';
import { addUtcDaysToYmd, getPreviousUtcDayYmd } from './daily-stats.utils.ts';

function createRepoMocks(
  overrides: {
    plan?: {
      count?: ReturnType<typeof vi.fn>;
      find?: ReturnType<typeof vi.fn>;
    };
    task?: {
      count?: ReturnType<typeof vi.fn>;
      find?: ReturnType<typeof vi.fn>;
    };
  } = {},
) {
  const planCount = overrides.plan?.count ?? vi.fn().mockResolvedValue(0);
  const planFind = overrides.plan?.find ?? vi.fn().mockResolvedValue([]);
  const taskCount = overrides.task?.count ?? vi.fn().mockResolvedValue(0);
  const taskFind = overrides.task?.find ?? vi.fn().mockResolvedValue([]);

  return {
    planRepo: { countByDateRange: planCount, findBy: planFind },
    taskRepo: { countByDateRange: taskCount, findBy: taskFind },
  };
}

describe('DailyStatsProcessor', () => {
  let processor: DailyStatsProcessor;
  let mockJob: AggregateDailyStatsJob;
  let dailyStats: DailyStatsRepositoryMock;
  let mockEmitQueueJobCompleted: ReturnType<typeof vi.fn>;
  let mockLoggerError: ReturnType<typeof vi.fn>;
  let mockLoggerInfo: ReturnType<typeof vi.fn>;
  let mockLoggerLog: ReturnType<typeof vi.fn>;
  let planRepoMocks: ReturnType<typeof createRepoMocks>['planRepo'];
  let taskRepoMocks: ReturnType<typeof createRepoMocks>['taskRepo'];

  // Dynamic anchors so tests are stable on any run date.
  const yesterday = getPreviousUtcDayYmd();
  const dayBeforeYesterday = addUtcDaysToYmd(yesterday, -1);

  beforeEach(async () => {
    dailyStats = createDailyStatsRepositoryMock();
    // Tests never inspect the upserted row, so any DailyStat-shaped value will do.
    dailyStats.upsertForDate.mockImplementation(async (date) => {
      return dailyStatsFactory.build({ date: new Date(date) });
    });
    // Default: last row is 2 days ago and nothing else present → the only
    // missing day is yesterday (the normal daily case).
    dailyStats.getLatestDate.mockResolvedValue(dayBeforeYesterday);
    mockEmitQueueJobCompleted = vi.fn();
    mockLoggerError = vi.fn();
    mockLoggerInfo = vi.fn();
    mockLoggerLog = vi.fn();
    const repos = createRepoMocks();
    planRepoMocks = repos.planRepo;
    taskRepoMocks = repos.taskRepo;

    mockJob = createMock<AggregateDailyStatsJob>({
      data: {},
      id: 'job-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsProcessor,
        {
          provide: DailyStatsRepository,
          useValue: dailyStats,
        },
        {
          provide: LoggerService,
          useValue: {
            error: mockLoggerError,
            info: mockLoggerInfo,
            log: mockLoggerLog,
          },
        },
        {
          provide: NotificationsService,
          useValue: { emitQueueJobCompleted: mockEmitQueueJobCompleted },
        },
        {
          provide: PlansRepository,
          useValue: planRepoMocks,
        },
        {
          provide: TasksRepository,
          useValue: taskRepoMocks,
        },
      ],
    }).compile();

    processor = module.get(DailyStatsProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process an aggregate-daily-stats job without throwing', async () => {
    await expect(processor.process(mockJob)).resolves.toBeUndefined();
  });

  it('should return aggregate with date and zero counts when no data in range', async () => {
    const result = await processor.aggregateDailyStats();

    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.plansCreated).toBe(0);
    expect(result.plansUpdated).toBe(0);
    expect(result.plansCompleted).toBe(0);
    expect(result.tasksCreated).toBe(0);
    expect(result.tasksUpdated).toBe(0);
    expect(result.tasksCompleted).toBe(0);
    expect(result.plansByStatus).toEqual({});
    expect(result.tasksByStatus).toEqual({});
  });

  it('aggregates an arbitrary target date (UTC) when one is supplied', async () => {
    const result = await processor.aggregateDailyStats('2026-02-08');

    expect(result.date).toBe('2026-02-08');
    expect(planRepoMocks.countByDateRange).toHaveBeenCalled();
  });

  it('counts completions by completedAt day range, not status+updatedAt', async () => {
    const planCount = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);
    const taskCount = vi
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);
    const repos = createRepoMocks({
      plan: { count: planCount },
      task: { count: taskCount },
    });
    planRepoMocks = repos.planRepo;
    taskRepoMocks = repos.taskRepo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsProcessor,
        {
          provide: DailyStatsRepository,
          useValue: createDailyStatsRepositoryMock(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
        {
          provide: PlansRepository,
          useValue: planRepoMocks,
        },
        {
          provide: TasksRepository,
          useValue: taskRepoMocks,
        },
      ],
    }).compile();

    const p = module.get(DailyStatsProcessor);
    const result = await p.aggregateDailyStats('2026-07-09');

    expect(result.plansCompleted).toBe(5);
    expect(result.tasksCompleted).toBe(2);

    expect(planCount.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ column: 'completedAt' }),
    );
    expect(taskCount.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({ column: 'completedAt' }),
    );
  });

  describe('on-boot catch-up', () => {
    beforeEach(() => {
      vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
      vi.stubEnv('OT_WORKTREE_DB', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('backfills missing days on the owner’s boot', async () => {
      await processor.onModuleInit();

      expect(dailyStats.getLatestDate).toHaveBeenCalledTimes(1);
      expect(dailyStats.upsertForDate).toHaveBeenCalledTimes(1);
    });

    it('a shared-DB worktree writes no daily_stats rows at boot', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      await processor.onModuleInit();

      expect(dailyStats.getLatestDate).not.toHaveBeenCalled();
      expect(dailyStats.upsertForDate).not.toHaveBeenCalled();
    });
  });

  it('upserts a zero-count row for a quiet day so the chart stays continuous', async () => {
    await processor.process(mockJob);

    expect(dailyStats.upsertForDate).toHaveBeenCalledTimes(1);
    const [dateArg, payload] = dailyStats.upsertForDate.mock.calls[0] ?? [];

    expect(dateArg).toBe(yesterday);
    expect(payload).toMatchObject({
      plansByStatus: {},
      plansCompleted: 0,
      plansCreated: 0,
      plansUpdated: 0,
      tasksByStatus: {},
      tasksCompleted: 0,
      tasksCreated: 0,
      tasksUpdated: 0,
    });
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledTimes(1);
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'daily-stats',
      message: `Daily stats aggregated for ${yesterday}`,
      severity: 'success',
    });
  });

  it('backfills every missing day in the gap and emits ONE summary notification', async () => {
    // Last row is 4 days before yesterday → window is [y-3 .. y] (4 days).
    const latest = addUtcDaysToYmd(yesterday, -4);
    const present = addUtcDaysToYmd(yesterday, -2);
    dailyStats.getLatestDate.mockResolvedValue(latest);
    dailyStats.getExistingDatesInRange.mockResolvedValue(
      new Set<string>([present]),
    );

    await processor.process(mockJob);

    const upsertedDates = dailyStats.upsertForDate.mock.calls.map(
      ([date]) => date,
    );
    expect(upsertedDates).toEqual([
      addUtcDaysToYmd(yesterday, -3),
      addUtcDaysToYmd(yesterday, -1),
      yesterday,
    ]);
    // Exactly one notification for the whole batch, not one per day.
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledTimes(1);
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'daily-stats',
      message: `Daily stats backfilled 3 days (${addUtcDaysToYmd(yesterday, -3)}..${yesterday})`,
      severity: 'success',
    });
  });

  it('is a no-op when the table is already current (no upsert, no notification)', async () => {
    dailyStats.getLatestDate.mockResolvedValue(yesterday);

    await processor.process(mockJob);

    expect(dailyStats.getExistingDatesInRange).not.toHaveBeenCalled();
    expect(dailyStats.upsertForDate).not.toHaveBeenCalled();
    expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
  });

  it('is a no-op when every candidate day is already present', async () => {
    const latest = addUtcDaysToYmd(yesterday, -2);
    dailyStats.getLatestDate.mockResolvedValue(latest);
    dailyStats.getExistingDatesInRange.mockResolvedValue(
      new Set<string>([addUtcDaysToYmd(yesterday, -1), yesterday]),
    );

    await processor.process(mockJob);

    expect(dailyStats.upsertForDate).not.toHaveBeenCalled();
    expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
  });

  it('resolves without throwing, logs error, and emits error notification when upsert fails', async () => {
    dailyStats.upsertForDate.mockRejectedValueOnce(new Error('upsert failed'));

    await expect(processor.process(mockJob)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('jobId=job-1'),
      DailyStatsProcessor.name,
    );
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'daily-stats',
      message: 'Daily stats job failed: job-1',
      severity: 'error',
    });
  });

  it('resolves without throwing and emits error when aggregation fails', async () => {
    planRepoMocks.countByDateRange.mockRejectedValueOnce(
      new Error('count failed'),
    );

    await expect(processor.process(mockJob)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('jobId=job-1'),
      DailyStatsProcessor.name,
    );
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'daily-stats',
      message: 'Daily stats job failed: job-1',
      severity: 'error',
    });
  });

  it('uses final status per id when a plan appears in both created and updated lists', async () => {
    const planCount = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    const planFind = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'p1', status: 'PENDING' }])
      .mockResolvedValueOnce([{ id: 'p1', status: 'COMPLETED' }]);
    const repos = createRepoMocks({
      plan: { count: planCount, find: planFind },
    });
    planRepoMocks = repos.planRepo;
    taskRepoMocks = repos.taskRepo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsProcessor,
        {
          provide: DailyStatsRepository,
          useValue: createDailyStatsRepositoryMock(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
        {
          provide: PlansRepository,
          useValue: planRepoMocks,
        },
        {
          provide: TasksRepository,
          useValue: taskRepoMocks,
        },
      ],
    }).compile();

    const p = module.get(DailyStatsProcessor);
    const result = await p.aggregateDailyStats();

    expect(result.plansByStatus).toEqual({ COMPLETED: 1 });
  });

  it('counts null task status as unknown in tasksByStatus', async () => {
    const taskFind = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 't1', status: null }]);
    const repos = createRepoMocks({
      task: { find: taskFind },
    });
    planRepoMocks = repos.planRepo;
    taskRepoMocks = repos.taskRepo;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsProcessor,
        {
          provide: DailyStatsRepository,
          useValue: createDailyStatsRepositoryMock(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>(),
        },
        {
          provide: PlansRepository,
          useValue: planRepoMocks,
        },
        {
          provide: TasksRepository,
          useValue: taskRepoMocks,
        },
      ],
    }).compile();

    const p = module.get(DailyStatsProcessor);
    const result = await p.aggregateDailyStats();

    expect(result.tasksByStatus).toEqual({ unknown: 1 });
  });
});
