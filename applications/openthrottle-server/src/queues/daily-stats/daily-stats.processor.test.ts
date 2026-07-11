import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  DailyStatsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { NotificationsService } from '../../notifications/notifications.service';
import { addUtcDaysToYmd, getPreviousUtcDayYmd } from './daily-stats.dates';
import type { AggregateDailyStatsJob } from './daily-stats.types';
import { DailyStatsProcessor } from './daily-stats.processor';

/**
 * Local mock signature for `DailyStatsService.upsertForDate`: same call args as the real
 * service method, but a simplified `Record`-shaped resolved value (tests never inspect it)
 * so the mock doesn't need a full `DailyStat` entity fixture.
 */
type MockUpsertForDate = (
  ...args: Parameters<DailyStatsService['upsertForDate']>
) => Promise<Record<string, unknown>>;

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
    planRepo: { count: planCount, find: planFind },
    taskRepo: { count: taskCount, find: taskFind },
  };
}

describe('DailyStatsProcessor', () => {
  let processor: DailyStatsProcessor;
  let mockJob: AggregateDailyStatsJob;
  let mockUpsertForDate: ReturnType<typeof vi.fn<MockUpsertForDate>>;
  let mockGetLatestDate: ReturnType<typeof vi.fn>;
  let mockGetExistingDatesInRange: ReturnType<typeof vi.fn>;
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
    mockUpsertForDate = vi.fn<MockUpsertForDate>().mockResolvedValue({});
    // Default: last row is 2 days ago and nothing else present → the only
    // missing day is yesterday (the normal daily case).
    mockGetLatestDate = vi.fn().mockResolvedValue(dayBeforeYesterday);
    mockGetExistingDatesInRange = vi.fn().mockResolvedValue(new Set<string>());
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
          provide: DailyStatsService,
          useValue: {
            getExistingDatesInRange: mockGetExistingDatesInRange,
            getLatestDate: mockGetLatestDate,
            upsertForDate: mockUpsertForDate,
          },
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
          provide: PlansService,
          useValue: { getRepository: () => planRepoMocks },
        },
        {
          provide: TasksService,
          useValue: { getRepository: () => taskRepoMocks },
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
    expect(planRepoMocks.count).toHaveBeenCalled();
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
          provide: DailyStatsService,
          useValue: createMock<DailyStatsService>(),
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
          provide: PlansService,
          useValue: { getRepository: () => planRepoMocks },
        },
        {
          provide: TasksService,
          useValue: { getRepository: () => taskRepoMocks },
        },
      ],
    }).compile();

    const p = module.get(DailyStatsProcessor);
    const result = await p.aggregateDailyStats('2026-07-09');

    expect(result.plansCompleted).toBe(5);
    expect(result.tasksCompleted).toBe(2);

    const planCompletedWhere = planCount.mock.calls[2]?.[0]?.where;
    expect(planCompletedWhere).toEqual(
      expect.objectContaining({ completedAt: expect.anything() }),
    );
    expect(planCompletedWhere).not.toHaveProperty('status');
    expect(planCompletedWhere).not.toHaveProperty('updatedAt');

    const taskCompletedWhere = taskCount.mock.calls[2]?.[0]?.where;
    expect(taskCompletedWhere).toEqual(
      expect.objectContaining({ completedAt: expect.anything() }),
    );
    expect(taskCompletedWhere).not.toHaveProperty('status');
    expect(taskCompletedWhere).not.toHaveProperty('updatedAt');
  });

  it('upserts a zero-count row for a quiet day so the chart stays continuous', async () => {
    await processor.process(mockJob);

    expect(mockUpsertForDate).toHaveBeenCalledTimes(1);
    const [dateArg, payload] = mockUpsertForDate.mock.calls[0];

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
    mockGetLatestDate.mockResolvedValue(latest);
    mockGetExistingDatesInRange.mockResolvedValue(new Set<string>([present]));

    await processor.process(mockJob);

    const upsertedDates = mockUpsertForDate.mock.calls.map(([date]) => date);
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
    mockGetLatestDate.mockResolvedValue(yesterday);

    await processor.process(mockJob);

    expect(mockGetExistingDatesInRange).not.toHaveBeenCalled();
    expect(mockUpsertForDate).not.toHaveBeenCalled();
    expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
  });

  it('is a no-op when every candidate day is already present', async () => {
    const latest = addUtcDaysToYmd(yesterday, -2);
    mockGetLatestDate.mockResolvedValue(latest);
    mockGetExistingDatesInRange.mockResolvedValue(
      new Set<string>([addUtcDaysToYmd(yesterday, -1), yesterday]),
    );

    await processor.process(mockJob);

    expect(mockUpsertForDate).not.toHaveBeenCalled();
    expect(mockEmitQueueJobCompleted).not.toHaveBeenCalled();
  });

  it('resolves without throwing, logs error, and emits error notification when upsert fails', async () => {
    mockUpsertForDate.mockRejectedValueOnce(new Error('upsert failed'));

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
    planRepoMocks.count.mockRejectedValueOnce(new Error('count failed'));

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
          provide: DailyStatsService,
          useValue: createMock<DailyStatsService>(),
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
          provide: PlansService,
          useValue: { getRepository: () => planRepoMocks },
        },
        {
          provide: TasksService,
          useValue: { getRepository: () => taskRepoMocks },
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
          provide: DailyStatsService,
          useValue: createMock<DailyStatsService>(),
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
          provide: PlansService,
          useValue: { getRepository: () => planRepoMocks },
        },
        {
          provide: TasksService,
          useValue: { getRepository: () => taskRepoMocks },
        },
      ],
    }).compile();

    const p = module.get(DailyStatsProcessor);
    const result = await p.aggregateDailyStats();

    expect(result.tasksByStatus).toEqual({ unknown: 1 });
  });
});
