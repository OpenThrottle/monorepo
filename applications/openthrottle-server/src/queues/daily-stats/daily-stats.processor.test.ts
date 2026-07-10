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
  let mockEmitQueueJobCompleted: ReturnType<typeof vi.fn>;
  let mockLoggerError: ReturnType<typeof vi.fn>;
  let mockLoggerInfo: ReturnType<typeof vi.fn>;
  let mockLoggerLog: ReturnType<typeof vi.fn>;
  let planRepoMocks: ReturnType<typeof createRepoMocks>['planRepo'];
  let taskRepoMocks: ReturnType<typeof createRepoMocks>['taskRepo'];

  beforeEach(async () => {
    mockUpsertForDate = vi.fn<MockUpsertForDate>().mockResolvedValue({});
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
          useValue: { upsertForDate: mockUpsertForDate },
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

  it('should call upsertForDate and emit success notification on happy path', async () => {
    await processor.process(mockJob);

    expect(mockUpsertForDate).toHaveBeenCalledTimes(1);
    const [dateArg, payload] = mockUpsertForDate.mock.calls[0];

    expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
    expect(mockEmitQueueJobCompleted).toHaveBeenCalledWith({
      jobType: 'daily-stats',
      message: expect.stringContaining('Daily stats aggregated for'),
      severity: 'success',
    });
  });

  it('should resolve without throwing, log error, and emit error notification when upsert fails', async () => {
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

  it('should resolve without throwing and emit error when aggregation fails', async () => {
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
          useValue: { upsertForDate: mockUpsertForDate },
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
          useValue: { upsertForDate: mockUpsertForDate },
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
