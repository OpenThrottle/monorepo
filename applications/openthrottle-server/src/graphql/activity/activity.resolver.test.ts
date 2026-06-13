/**
 * @description Unit tests for activity ResolveField handlers (plan, task) on commit rows, output chunk rows, and task-updated rows. Relations resolve through the request-scoped ActivityLoaders.
 */

import { plansFactory, tasksFactory } from '@openthrottle/nestjs-repositories';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, beforeAll, test, vi } from 'vitest';
import {
  ActivityCommitRowObject,
  ActivityOutputChunkRowObject,
  ActivityTaskUpdatedRowObject,
} from './activity.object';
import { ActivityLoaders } from './activity-loaders';
import {
  ActivityCommitRowResolver,
  ActivityOutputChunkRowResolver,
  ActivityTaskUpdatedRowResolver,
} from './activity.resolver';

const mockPlan = plansFactory.build();
const mockTask = tasksFactory.build();

const mockPlanLoad = vi.fn().mockResolvedValue(null);
const mockTaskLoad = vi.fn().mockResolvedValue(null);
const mockLoaders: ActivityLoaders = {
  planLoader: { load: mockPlanLoad },
  taskLoader: { load: mockTaskLoad },
} as unknown as ActivityLoaders;

beforeEach(() => {
  mockPlanLoad.mockReset().mockResolvedValue(null);
  mockTaskLoad.mockReset().mockResolvedValue(null);
});

describe('ActivityCommitRowResolver', () => {
  let resolver: ActivityCommitRowResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityCommitRowResolver,
        { provide: ActivityLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<ActivityCommitRowResolver>(ActivityCommitRowResolver);
  });

  describe('plan (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no planId', async () => {
      const parent = new ActivityCommitRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('resolves the plan through planLoader when planId is set', async () => {
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const parent = new ActivityCommitRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(mockPlanLoad).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toBe(mockPlan);
    });
  });

  describe('task (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no taskId', async () => {
      const parent = new ActivityCommitRowObject();
      parent.taskId = null;

      const result = await resolver.task(parent);

      expect(result).toBeNull();
      expect(mockTaskLoad).not.toHaveBeenCalled();
    });

    test('resolves the task through taskLoader when taskId is set', async () => {
      mockTaskLoad.mockResolvedValueOnce(mockTask);

      const parent = new ActivityCommitRowObject();
      parent.taskId = mockTask.id;

      const result = await resolver.task(parent);

      expect(mockTaskLoad).toHaveBeenCalledWith(mockTask.id);
      expect(result).toBe(mockTask);
    });
  });
});

describe('ActivityOutputChunkRowResolver', () => {
  let resolver: ActivityOutputChunkRowResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityOutputChunkRowResolver,
        { provide: ActivityLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<ActivityOutputChunkRowResolver>(
      ActivityOutputChunkRowResolver,
    );
  });

  describe('plan (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no planId', async () => {
      const parent = new ActivityOutputChunkRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('resolves the plan through planLoader when planId is set', async () => {
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const parent = new ActivityOutputChunkRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(mockPlanLoad).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toBe(mockPlan);
    });
  });
});

describe('ActivityTaskUpdatedRowResolver', () => {
  let resolver: ActivityTaskUpdatedRowResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ActivityTaskUpdatedRowResolver,
        { provide: ActivityLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<ActivityTaskUpdatedRowResolver>(
      ActivityTaskUpdatedRowResolver,
    );
  });

  describe('plan (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no planId', async () => {
      const parent = new ActivityTaskUpdatedRowObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('resolves the plan through planLoader when planId is set', async () => {
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.planId = mockPlan.id;

      const result = await resolver.plan(parent);

      expect(mockPlanLoad).toHaveBeenCalledWith(mockPlan.id);
      expect(result).toBe(mockPlan);
    });
  });

  describe('task (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no id', async () => {
      const parent = new ActivityTaskUpdatedRowObject();
      parent.id = '';

      const result = await resolver.task(parent);

      expect(result).toBeNull();
      expect(mockTaskLoad).not.toHaveBeenCalled();
    });

    test('resolves the task through taskLoader using the row id (id is task id)', async () => {
      mockTaskLoad.mockResolvedValueOnce(mockTask);

      const parent = new ActivityTaskUpdatedRowObject();
      parent.id = mockTask.id;

      const result = await resolver.task(parent);

      expect(mockTaskLoad).toHaveBeenCalledWith(mockTask.id);
      expect(result).toBe(mockTask);
    });
  });
});
