import { describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { createMock } from '@golevelup/ts-vitest';
import {
  DailyStatsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AggregateDailyStatsJob } from './daily-stats.types';
import { DailyStatsProcessor } from './daily-stats.processor';

function mockRepo() {
  return {
    count: () => Promise.resolve(0),
    find: () => Promise.resolve([]),
  };
}

describe('DailyStatsProcessor', () => {
  let processor: DailyStatsProcessor;
  let mockJob: AggregateDailyStatsJob;

  beforeEach(async () => {
    mockJob = {
      data: {},
      id: 'job-1',
    } as AggregateDailyStatsJob;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyStatsProcessor,
        {
          provide: DailyStatsService,
          useValue: { upsertForDate: () => Promise.resolve({} as never) },
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
          useValue: { getRepository: () => mockRepo() },
        },
        {
          provide: TasksService,
          useValue: { getRepository: () => mockRepo() },
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
});
