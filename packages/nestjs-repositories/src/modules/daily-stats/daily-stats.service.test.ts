import { beforeAll, describe, expect, it, vi } from 'vitest';
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

  const buildServiceWithRepo = async (
    repoOverrides: Parameters<typeof createMock<GetRepository>>[0],
  ): Promise<DailyStatsService> => {
    const app = await Test.createTestingModule({
      providers: [
        DailyStatsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(DailyStat),
          useValue: createMock<GetRepository>(repoOverrides),
        },
      ],
    }).compile();

    return app.get<DailyStatsService>(DailyStatsService);
  };

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
              const wanted = new Date(
                (where as unknown as { date: Date }).date,
              ).getTime();
              return (
                saved.find((r) => new Date(r.date).getTime() === wanted) ?? null
              );
            },
            upsert: async (e: DeepPartial<DailyStat>) => {
              const row = e as unknown as DailyStat;
              const idx = saved.findIndex(
                (r) =>
                  new Date(r.date).getTime() === new Date(row.date).getTime(),
              );
              if (idx >= 0) {
                saved[idx] = { ...saved[idx], ...row } as DailyStat;
              } else {
                saved.push(row);
              }

              // FIXME: Tighten this up — minimal InsertResult shape for the mock

              return {
                generatedMaps: [],
                identifiers: [],
                raw: [],
              } as unknown as Awaited<ReturnType<GetRepository['upsert']>>;
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

    // Guards the concurrent-upsert claim: upsertForDate must reach for the
    // atomic single-statement repo.upsert keyed on `date`, not a read-then-write
    // insert. Two writers racing the same date therefore merge instead of one
    // losing with a 23505 unique-violation on the unique `date` column.
    it('uses the atomic upsert keyed on date (never a plain insert)', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({
        generatedMaps: [],
        identifiers: [],
        raw: [],
      });
      const localService = await buildServiceWithRepo({
        create: (d: DeepPartial<DailyStat>) => ({
          ...dailyStatsFactory.build(),
          ...d,
        }),
        findOne: async () => null,
        insert: vi.fn(),
        upsert: upsertSpy,
      });

      await localService.upsertForDate('2026-02-09', {
        plansByStatus: {},
        plansCompleted: 0,
        plansCreated: 1,
        plansUpdated: 0,
        tasksByStatus: {},
        tasksCompleted: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
      });

      expect(upsertSpy).toHaveBeenCalledTimes(1);
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-02-09' }),
        ['date'],
      );
    });

    it('merges two concurrent upserts for the same date without a 23505', async () => {
      const store: DailyStat[] = [];
      const upsertSpy = vi.fn().mockImplementation(async (e) => {
        const row = e as DailyStat;
        const idx = store.findIndex(
          (r) => new Date(r.date).getTime() === new Date(row.date).getTime(),
        );
        if (idx >= 0) {
          store[idx] = { ...store[idx], ...row } as DailyStat;
        } else {
          store.push(row);
        }
        return { generatedMaps: [], identifiers: [], raw: [] };
      });
      const localService = await buildServiceWithRepo({
        create: (d: DeepPartial<DailyStat>) => ({
          ...dailyStatsFactory.build(),
          ...d,
        }),
        findOne: async ({ where }) => {
          const wanted = new Date(
            (where as unknown as { date: Date }).date,
          ).getTime();
          return (
            store.find((r) => new Date(r.date).getTime() === wanted) ?? null
          );
        },
        upsert: upsertSpy,
      });

      const payload = (plansCreated: number) => ({
        plansByStatus: {},
        plansCompleted: 0,
        plansCreated,
        plansUpdated: 0,
        tasksByStatus: {},
        tasksCompleted: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
      });

      const [first, second] = await Promise.all([
        localService.upsertForDate('2026-02-10', payload(1)),
        localService.upsertForDate('2026-02-10', payload(2)),
      ]);

      expect(upsertSpy).toHaveBeenCalledTimes(2);
      expect(store).toHaveLength(1);
      expect(first.date).toBe('2026-02-10');
      expect(second.date).toBe('2026-02-10');
    });
  });
});
