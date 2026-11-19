import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanTag } from './plan-tag.entity.ts';
import { planTagsFactory } from './plan-tags.factory.ts';
import { PlanTagsRepository } from './plan-tags.repository.ts';

const planId = '22222222-2222-4222-8222-222222222222';

describe('PlanTagsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  let repository: PlanTagsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);

    const app = await Test.createTestingModule({
      providers: [
        PlanTagsRepository,
        {
          provide: getRepositoryToken(PlanTag),
          useValue: createMock<Repository<PlanTag>>({
            find,
            findOne,
            target: PlanTag,
          }),
        },
      ],
    }).compile();

    repository = app.get(PlanTagsRepository);
  });

  describe('findByPlanAndTag', () => {
    it('looks the tag up on that plan', async () => {
      const row = planTagsFactory.build({ planId, tag: 'backend' });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByPlanAndTag(planId, 'backend'),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { planId, tag: 'backend' },
      });
    });

    it('returns null when the plan lacks the tag', async () => {
      await expect(
        repository.findByPlanAndTag(planId, 'backend'),
      ).resolves.toBeNull();
    });
  });

  describe('findByPlanAndDimension', () => {
    it('looks the dimension up on that plan', async () => {
      const row = planTagsFactory.build({ dimension: 'phase', planId });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByPlanAndDimension(planId, 'phase'),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { dimension: 'phase', planId },
      });
    });
  });

  describe('listByPlanId', () => {
    it('returns every tag row on the plan', async () => {
      const rows = planTagsFactory.buildList(2, { planId });
      find.mockResolvedValue(rows);

      await expect(repository.listByPlanId(planId)).resolves.toEqual(rows);
      expect(find).toHaveBeenCalledWith({ where: { planId } });
    });
  });
});
