import {
  dailyStatsFactory,
  DailyStatsService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { DailyStatsResolver } from './daily-stats.resolver';

/**
 * @description Unit tests for daily stats resolver: dailyStats and dailyStatsRange. Mocks DailyStatsService.
 */
describe('DailyStatsResolver', () => {
  let resolver: DailyStatsResolver;

  const mockRow = dailyStatsFactory.build({
    date: new Date('2026-02-07'),
    plansByStatus: { completed: 1, pending: 2 },
    plansCompleted: 1,
    plansCreated: 2,
    plansUpdated: 1,
    tasksByStatus: { completed: 3, in_progress: 1 },
    tasksCompleted: 3,
    tasksCreated: 4,
    tasksUpdated: 2,
  });

  const findOne = vi.fn();
  const getMany = vi.fn();
  const createQueryBuilder = vi.fn().mockReturnValue({
    andWhere: vi.fn().mockReturnThis(),
    getMany: () => getMany(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  });

  const mockRepo = {
    createQueryBuilder,
    findOne,
  };

  const mockDailyStatsService = createMock<DailyStatsService>({
    getRepository: vi.fn().mockReturnValue(mockRepo),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        DailyStatsResolver,
        { provide: DailyStatsService, useValue: mockDailyStatsService },
      ],
    }).compile();

    resolver = app.get(DailyStatsResolver);
  });

  describe('dailyStats', () => {
    test('returns null when no row for date', async () => {
      findOne.mockResolvedValueOnce(null);

      const result = await resolver.dailyStats('2026-02-10');

      expect(result).toBeNull();
      expect(findOne).toHaveBeenCalledWith({
        where: { date: new Date('2026-02-10') },
      });
    });

    test('returns DailyStatsObject when row exists', async () => {
      findOne.mockResolvedValueOnce(mockRow);

      const result = await resolver.dailyStats('2026-02-07');

      expect(result).not.toBeNull();
      expect(result?.date).toBe('2026-02-07');
      expect(result?.plansCreated).toBe(2);
      expect(result?.plansCompleted).toBe(1);
      expect(result?.plansUpdated).toBe(1);
      expect(result?.tasksCreated).toBe(4);
      expect(result?.tasksCompleted).toBe(3);
      expect(result?.tasksUpdated).toBe(2);
      expect(result?.plansByStatusJson).toBe(
        JSON.stringify(mockRow.plansByStatus),
      );
      expect(result?.tasksByStatusJson).toBe(
        JSON.stringify(mockRow.tasksByStatus),
      );
    });
  });

  describe('dailyStatsRange', () => {
    test('returns items ordered by date', async () => {
      const rows = [
        dailyStatsFactory.build({ date: new Date('2026-02-01') }),
        dailyStatsFactory.build({ date: new Date('2026-02-02') }),
      ];
      getMany.mockResolvedValueOnce(rows);

      const result = await resolver.dailyStatsRange('2026-02-01', '2026-02-02');

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.date).toBe('2026-02-01');
      expect(result.items[1]?.date).toBe('2026-02-02');
      expect(createQueryBuilder).toHaveBeenCalledWith('d');
    });
  });
});
