import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';
import { skillAvailabilityRulesFactory } from './skill-availability-rules.factory.ts';
import { SkillAvailabilityRulesRepository } from './skill-availability-rules.repository.ts';

const ruleSetId = '22222222-2222-4222-8222-222222222222';
const ruleId = '33333333-3333-4333-8333-333333333333';

describe('SkillAvailabilityRulesRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const softDelete = vi.fn();
  let repository: SkillAvailabilityRulesRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    softDelete.mockResolvedValue({ affected: 0 });

    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityRulesRepository,
        {
          provide: getRepositoryToken(SkillAvailabilityRule),
          useValue: createMock<Repository<SkillAvailabilityRule>>({
            find,
            findOne,
            softDelete,
            target: SkillAvailabilityRule,
          }),
        },
      ],
    }).compile();

    repository = app.get(SkillAvailabilityRulesRepository);
  });

  describe('findRuleById', () => {
    it('returns the rule when it is live', async () => {
      const rule = skillAvailabilityRulesFactory.build({ id: ruleId });
      findOne.mockResolvedValue(rule);

      await expect(repository.findRuleById(ruleId)).resolves.toBe(rule);
      expect(findOne).toHaveBeenCalledWith({ where: { id: ruleId } });
    });

    it('returns null instead of throwing when the rule is absent', async () => {
      await expect(repository.findRuleById(ruleId)).resolves.toBeNull();
    });
  });

  describe('listByRuleSetId', () => {
    it('lists the rule set rules in creation order', async () => {
      const rules = skillAvailabilityRulesFactory.buildList(2, { ruleSetId });
      find.mockResolvedValue(rules);

      await expect(repository.listByRuleSetId(ruleSetId)).resolves.toEqual(
        rules,
      );
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', id: 'ASC' },
        where: { ruleSetId },
      });
    });
  });

  describe('removeRule', () => {
    it('soft deletes the live rule and returns true', async () => {
      softDelete.mockResolvedValue({ affected: 1 });

      await expect(repository.removeRule(ruleId)).resolves.toBe(true);
      expect(softDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: ruleId }),
      );
    });

    it('returns false when no live rule matched', async () => {
      await expect(repository.removeRule(ruleId)).resolves.toBe(false);
    });
  });
});
