/**
 * @description Unit tests for activity ResolveField handlers (plan, task) on commit rows, output chunk rows, and task-updated rows.
 */

import {
  plansFactory,
  PlansService,
  tasksFactory,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import {
  ActivityCommitRowObject,
  ActivityOutputChunkRowObject,
  ActivityTaskUpdatedRowObject,
} from './activity.object';
import {
  ActivityCommitRowResolver,
  ActivityOutputChunkRowResolver,
  ActivityTaskUpdatedRowResolver,
} from './activity.resolver';

const mockPlan = plansFactory.build();
const mockTask = tasksFactory.build();

describe('ActivityCommitRowResolver', () => {
  let resolver: ActivityCommitRowResolver;
  const plansRepo = { findOne: vi.fn() };
  const tasksRepo = { findOne: vi.fn() };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(plansRepo),
  });
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(tasksRepo),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityCommitRowResolver,
        { provide: PlansService, useValue: mockPlansService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    resolver = app.get<ActivityCommitRowResolver>(ActivityCommitRowResolver);
  });

  describe('plan (ResolveField)', () => {
    test('returns null when parent has no planId', async () => {
      const parent = new ActivityCommitRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns PlanObject when plan exists', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(mockPlan);

      const parent = new ActivityCommitRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
    });

    test('returns null when plan not found', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(null);

      const parent = new ActivityCommitRowObject();
      parent.planId = 'missing-plan-id';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });

  describe('task (ResolveField)', () => {
    test('returns null when parent has no taskId', async () => {
      const parent = new ActivityCommitRowObject();
      parent.taskId = null;

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });

    test('returns TaskObject when task exists', async () => {
      vi.mocked(tasksRepo.findOne).mockResolvedValue(mockTask);

      const parent = new ActivityCommitRowObject();
      parent.taskId = mockTask.id;

      const result = await resolver.task(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTask.id);
      expect(result?.title).toBe(mockTask.title);
    });

    test('returns null when task not found', async () => {
      vi.mocked(tasksRepo.findOne).mockResolvedValue(null);

      const parent = new ActivityCommitRowObject();
      parent.taskId = 'missing-task-id';

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });
  });
});

describe('ActivityOutputChunkRowResolver', () => {
  let resolver: ActivityOutputChunkRowResolver;
  const plansRepo = { findOne: vi.fn() };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(plansRepo),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityOutputChunkRowResolver,
        { provide: PlansService, useValue: mockPlansService },
      ],
    }).compile();

    resolver = app.get<ActivityOutputChunkRowResolver>(
      ActivityOutputChunkRowResolver,
    );
  });

  describe('plan (ResolveField)', () => {
    test('returns null when parent has no planId', async () => {
      const parent = new ActivityOutputChunkRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns PlanObject when plan exists', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(mockPlan);

      const parent = new ActivityOutputChunkRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
    });

    test('returns null when plan not found', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(null);

      const parent = new ActivityOutputChunkRowObject();
      parent.planId = 'missing-plan-id';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });
});

describe('ActivityTaskUpdatedRowResolver', () => {
  let resolver: ActivityTaskUpdatedRowResolver;
  const plansRepo = { findOne: vi.fn() };
  const tasksRepo = { findOne: vi.fn() };

  const mockPlansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue(plansRepo),
  });
  const mockTasksService = createMock<TasksService>({
    getRepository: vi.fn().mockReturnValue(tasksRepo),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityTaskUpdatedRowResolver,
        { provide: PlansService, useValue: mockPlansService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    resolver = app.get<ActivityTaskUpdatedRowResolver>(
      ActivityTaskUpdatedRowResolver,
    );
  });

  describe('plan (ResolveField)', () => {
    test('returns null when parent has no planId', async () => {
      const parent = new ActivityTaskUpdatedRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns PlanObject when plan exists', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(mockPlan);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
    });

    test('returns null when plan not found', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(null);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.planId = 'missing-plan-id';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });

  describe('task (ResolveField)', () => {
    test('returns null when parent has no id', async () => {
      const parent = new ActivityTaskUpdatedRowObject();
      parent.id = '';

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });

    test('returns TaskObject when task exists (id is task id)', async () => {
      vi.mocked(tasksRepo.findOne).mockResolvedValue(mockTask);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.id = mockTask.id;

      const result = await resolver.task(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTask.id);
      expect(result?.title).toBe(mockTask.title);
    });

    test('returns null when task not found', async () => {
      vi.mocked(tasksRepo.findOne).mockResolvedValue(null);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.id = 'missing-task-id';

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });
  });
});
