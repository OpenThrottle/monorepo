import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Not } from 'typeorm';
import { PlansService } from '../plans/plans.service';
import { Task } from './task.entity';
import { tasksFactory } from './tasks.factory';
import { TASK_SORT_ORDER_GAP, TasksService } from './tasks.service';

describe('TasksService', () => {
  type GetRepository = ReturnType<TasksService['getRepository']>;

  const mockPlanRepo = {
    update: vi
      .fn()
      .mockResolvedValue({ affected: 0, generatedMaps: [], raw: [] }),
  };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(mockPlanRepo),
  });

  const mockQueryBuilder = {
    getRawOne: vi.fn(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };

  const mockTaskRepo = createMock<GetRepository>({
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    find: () => Promise.resolve(tasksFactory.buildList(2)),
  });

  let service: TasksService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        TasksService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
      ],
    }).compile();

    service = app.get<TasksService>(TasksService);
  });

  beforeEach(() => {
    vi.mocked(mockQueryBuilder.getRawOne).mockReset();
    vi.mocked(mockQueryBuilder.select).mockClear();
    vi.mocked(mockQueryBuilder.where).mockClear();
  });

  beforeEach(() => {
    vi.mocked(mockPlanRepo.update).mockResolvedValue({
      affected: 0,
      generatedMaps: [],
      raw: [],
    });
  });

  describe('getRepository', () => {
    it('returns the task repository', () => {
      const repo = service.getRepository();
      expect(repo).toBeDefined();
      expect(repo.find).toBeDefined();
    });

    it('returns factory-built data from find', async () => {
      const repo = service.getRepository();
      const tasks = await repo.find();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toMatchObject({
        planId: expect.any(String),
        status: expect.any(String),
        title: expect.any(String),
      });
    });
  });

  describe('resolveNextSortOrder', () => {
    const planId = '44444444-4444-4444-4444-444444444444';

    it('returns 1000 when plan has no tasks', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ max: null });

      const next = await service.resolveNextSortOrder(planId);

      expect(next).toBe(TASK_SORT_ORDER_GAP);
    });

    it('returns MAX(sort_order) + gap when plan has tasks', async () => {
      vi.mocked(mockQueryBuilder.getRawOne).mockResolvedValue({ max: '5000' });

      const next = await service.resolveNextSortOrder(planId);

      expect(next).toBe(5000 + TASK_SORT_ORDER_GAP);
    });
  });

  describe('syncParentPlanStatus', () => {
    it('returns true and runs atomic update when a non-IN_PROGRESS plan row is updated', async () => {
      const planId = '11111111-1111-1111-1111-111111111111';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 1,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(true);
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        { id: planId, status: Not('IN_PROGRESS') },
        { status: 'IN_PROGRESS' },
      );
    });

    it('returns false when the plan is already IN_PROGRESS (no row matched)', async () => {
      const planId = '22222222-2222-2222-2222-222222222222';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: 0,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(false);
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        { id: planId, status: Not('IN_PROGRESS') },
        { status: 'IN_PROGRESS' },
      );
    });

    it('treats undefined affected as no update', async () => {
      const planId = '33333333-3333-3333-3333-333333333333';
      vi.mocked(mockPlanRepo.update).mockResolvedValueOnce({
        affected: undefined,
        generatedMaps: [],
        raw: [],
      });

      const promoted = await service.syncParentPlanStatus(planId);

      expect(promoted).toBe(false);
    });
  });
});
