import type { Plan } from '@openthrottle/nestjs-repositories';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { PlanOutputStreamFieldsResolver } from './plan-output-stream-fields.resolver';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders';

const mockPlanLoad = vi.fn().mockResolvedValue(null);
const mockLoaders: PlanOutputStreamLoaders =
  createMock<PlanOutputStreamLoaders>({
    planLoader: { load: mockPlanLoad },
  });

describe('PlanOutputStreamFieldsResolver', () => {
  let resolver: PlanOutputStreamFieldsResolver;

  const mockPlan: Plan = {
    assignee: null,
    author: 'Plan author',
    category: 'Plan category',
    commitLinks: [],
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    description: 'Plan description',
    id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    jobRunHooks: { hooks: [] },
    planEmbeddings: [],
    planOutputChunks: [],
    project: null,
    projectId: null,
    projectRelation: null,
    runConfig: getDefaultPlanRunConfigStorage(),
    status: 'IN_PROGRESS',
    summary: null,
    tasks: [],
    title: 'Plan title',
    updatedAt: new Date('2026-02-01T22:00:00.000Z'),
  };

  const parentBase = {
    content: 'Iteration output chunk',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'fe000420-9f10-4d74-b7f2-d9c5c211ed50',
    iteration: 1,
    plan: null,
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanOutputStreamFieldsResolver,
        { provide: PlanOutputStreamLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<PlanOutputStreamFieldsResolver>(
      PlanOutputStreamFieldsResolver,
    );
  });

  describe('plan (ResolveField)', () => {
    test('resolves the plan through planLoader when planId is set', async () => {
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const result = await resolver.plan({ ...parentBase });

      expect(mockPlanLoad).toHaveBeenCalledWith(parentBase.planId);
      expect(result).toBe(mockPlan);
    });

    test('returns null without hitting the loader when planId is missing', async () => {
      mockPlanLoad.mockClear();

      const result = await resolver.plan({ ...parentBase, planId: '' });

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('returns null when planLoader resolves null', async () => {
      mockPlanLoad.mockResolvedValueOnce(null);

      const result = await resolver.plan({
        ...parentBase,
        planId: 'non-existent-plan-id',
      });

      expect(result).toBeNull();
    });
  });
});
