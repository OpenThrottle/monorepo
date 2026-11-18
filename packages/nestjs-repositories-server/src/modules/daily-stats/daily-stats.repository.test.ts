import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { asMock, isRecord } from '@openthrottle/nestjs-testing';
import type { DeepPartial, Repository } from 'typeorm';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { DailyStat } from './daily-stat.entity.ts';
import { dailyStatsFactory } from './daily-stats.factory.ts';
import { DailyStatsRepository } from './daily-stats.repository.ts';

const wantedDateTime = (where: unknown): number => {
  if (isRecord(where) && where.date instanceof Date) {
    return where.date.getTime();
  }
  return Number.NaN;
};

describe('DailyStatsRepository', () => {
  let service: DailyStatsRepository;

  type GetRepository = Repository<DailyStat>;

  const buildServiceWithRepo = async (
    repoOverrides: Parameters<typeof createMock<GetRepository>>[0],
  ): Promise<DailyStatsRepository> => {
    const app = await Test.createTestingModule({
      providers: [
        DailyStatsRepository,
        {
          provide: getRepositoryToken(DailyStat),
          useValue: createMock<GetRepository>({
            target: DailyStat,
            ...repoOverrides,
          }),
        },
      ],
    }).compile();

    return app.get<DailyStatsRepository>(DailyStatsRepository);
  };

  beforeAll(async () => {
    const saved: DailyStat[] = [];
    const app = await Test.createTestingModule({
      providers: [
        DailyStatsRepository,
        {
          provide: getRepositoryToken(DailyStat),
          useValue: createMock<GetRepository>({
            create: (d: DeepPartial<DailyStat>) => ({
              ...dailyStatsFactory.build(),
              ...d,
            }),
            findOne: async ({ where }) => {
              const wanted = wantedDateTime(where);
              return (
                saved.find((r) => new Date(r.date).getTime() === wanted) ?? null
              );
            },
            target: DailyStat,
            upsert: async (e: DeepPartial<DailyStat>) => {
              const row = asMock<DailyStat>(e);
              const idx = saved.findIndex(
                (r) =>
                  new Date(r.date).getTime() === new Date(row.date).getTime(),
              );
              if (idx >= 0) {
                saved[idx] = { ...saved[idx], ...row };
              } else {
                saved.push(row);
              }

              // Minimal InsertResult shape for the mock

              return asMock<Awaited<ReturnType<GetRepository['upsert']>>>({
                generatedMaps: [],
                identifiers: [],
                raw: [],
              });
            },
          }),
        },
      ],
    }).compile();

    service = app.get<DailyStatsRepository>(DailyStatsRepository);
  });

  describe('findByDate', () => {
    it('looks the row up by its date and returns null when there is none', async () => {
      const findOne = vi.fn().mockResolvedValue(null);
      const localService = await buildServiceWithRepo({ findOne });

      await expect(localService.findByDate('2026-02-11')).resolves.toBeNull();
      expect(findOne).toHaveBeenCalledWith({
        where: { date: new Date('2026-02-11') },
      });
    });
  });

  describe('findInRange', () => {
    it('reads the inclusive window oldest first', async () => {
      const rows = dailyStatsFactory.buildList(2);
      const builder = {
        andWhere: vi.fn(),
        getMany: vi.fn().mockResolvedValue(rows),
        orderBy: vi.fn(),
        where: vi.fn(),
      };

      builder.andWhere.mockReturnValue(builder);
      builder.orderBy.mockReturnValue(builder);
      builder.where.mockReturnValue(builder);

      const localService = await buildServiceWithRepo({
        createQueryBuilder: vi.fn().mockReturnValue(builder),
      });

      await expect(
        localService.findInRange('2026-02-01', '2026-02-02'),
      ).resolves.toBe(rows);
      expect(builder.where).toHaveBeenCalledWith('d.date >= :start', {
        start: '2026-02-01',
      });
      expect(builder.andWhere).toHaveBeenCalledWith('d.date <= :end', {
        end: '2026-02-02',
      });
      expect(builder.orderBy).toHaveBeenCalledWith('d.date', 'ASC');
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
        const row = asMock<DailyStat>(e);
        const idx = store.findIndex(
          (r) => new Date(r.date).getTime() === new Date(row.date).getTime(),
        );
        if (idx >= 0) {
          store[idx] = { ...store[idx], ...row };
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
          const wanted = wantedDateTime(where);
          return (
            store.find((r) => new Date(r.date).getTime() === wanted) ?? null
          );
        },
        upsert: upsertSpy,
      });

      const payload = (plansCreated: number) => {
        return {
          plansByStatus: {},
          plansCompleted: 0,
          plansCreated,
          plansUpdated: 0,
          tasksByStatus: {},
          tasksCompleted: 0,
          tasksCreated: 0,
          tasksUpdated: 0,
        };
      };

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
