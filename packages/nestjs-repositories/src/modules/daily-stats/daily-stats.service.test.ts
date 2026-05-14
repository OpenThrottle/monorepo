import { beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { DeepPartial } from 'typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { DailyStat } from './daily-stat.entity';
import { dailyStatsFactory } from './daily-stats.factory';
import { DailyStatsService } from './daily-stats.service';

describe('DailyStatsService', () => {
  let service: DailyStatsService;

  type GetRepository = ReturnType<DailyStatsService['getRepository']>;

  beforeAll(async () => {
    const saved: DailyStat[] = [];
    const app = await Test.createTestingModule({
      providers: [
        DailyStatsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(DailyStat),
          useValue: createMock<GetRepository>({
            create: (d: DeepPartial<DailyStat>) => ({
              ...dailyStatsFactory.build(),
              ...d,
            }),
            findOne: async ({ where }) => {
              return (
                saved.find(
                  // FIXME: Tighten this up

                  (r) => r.date === (where as unknown as { date: Date }).date,
                ) ?? null
              );
            },
            save: async (e: DeepPartial<DailyStat>) => {
              // FIXME: Tighten this up

              saved.push(e as unknown as DailyStat);

              // FIXME: Tighten this up

              return e as unknown as DailyStat;
            },
          }),
        },
      ],
    }).compile();

    service = app.get<DailyStatsService>(DailyStatsService);
  });

  describe('getRepository', () => {
    it('returns the daily stat repository', () => {
      const repo = service.getRepository();

      expect(repo).toBeDefined();
      expect(repo.save).toBeDefined();
    });
  });

  describe('upsertForDate', () => {
    it('creates a new row when no row exists for the date', async () => {
      const result = await service.upsertForDate('2026-02-07', {
        plansByStatus: { pending: 1 },
        plansCompleted: 0,
        plansCreated: 1,
        plansUpdated: 0,
        tasksByStatus: {},
        tasksCompleted: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
      });

      expect(result.date).toBe('2026-02-07');
      expect(result.plansCreated).toBe(1);
      expect(result.plansByStatus).toEqual({ pending: 1 });
    });
  });
});
