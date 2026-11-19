import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillAvailabilityRule } from '../skill-availability-rules/skill-availability-rule.entity.ts';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';
import { skillAvailabilityRuleSetsFactory } from './skill-availability-rule-sets.factory.ts';
import { SkillAvailabilityRuleSetsRepository } from './skill-availability-rule-sets.repository.ts';

const projectId = '22222222-2222-4222-8222-222222222222';
const ruleSetId = '44444444-4444-4444-8444-444444444444';

describe('SkillAvailabilityRuleSetsRepository', () => {
  const create = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  const transaction = vi.fn();
  const managerFindOne = vi.fn();
  const managerSoftDelete = vi.fn();
  let repository: SkillAvailabilityRuleSetsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<SkillAvailabilityRuleSet>) => {
      return skillAvailabilityRuleSetsFactory.build(data);
    });
    findOne.mockResolvedValue(null);
    save.mockImplementation(async (entity: SkillAvailabilityRuleSet) => {
      return entity;
    });
    managerFindOne.mockResolvedValue(null);
    managerSoftDelete.mockResolvedValue({ affected: 1 });

    const manager = createMock<EntityManager>({
      findOne: managerFindOne,
      softDelete: managerSoftDelete,
    });
    transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) => {
        return run(manager);
      },
    );

    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityRuleSetsRepository,
        {
          provide: getRepositoryToken(SkillAvailabilityRuleSet),
          useValue: createMock<Repository<SkillAvailabilityRuleSet>>({
            create,
            findOne,
            manager: createMock<EntityManager>({ transaction }),
            save,
            target: SkillAvailabilityRuleSet,
          }),
        },
      ],
    }).compile();

    repository = app.get(SkillAvailabilityRuleSetsRepository);
  });

  describe('findByProjectId', () => {
    it('returns the live rule set of the project', async () => {
      const ruleSet = skillAvailabilityRuleSetsFactory.build({ projectId });
      findOne.mockResolvedValue(ruleSet);

      await expect(repository.findByProjectId(projectId)).resolves.toBe(
        ruleSet,
      );
      expect(findOne).toHaveBeenCalledWith({ where: { projectId } });
    });

    it('returns null when the project has none', async () => {
      await expect(repository.findByProjectId(projectId)).resolves.toBeNull();
    });
  });

  describe('upsertPosture', () => {
    describe('when the project has no rule set', () => {
      it('creates one with the posture', async () => {
        const result = await repository.upsertPosture(projectId, 'deny');

        expect(create).toHaveBeenCalledWith({ posture: 'deny', projectId });
        expect(result.posture).toBe('deny');
      });
    });

    describe('when the project already has a rule set', () => {
      it('sets the posture of the existing one', async () => {
        const existing = skillAvailabilityRuleSetsFactory.build({
          id: ruleSetId,
          posture: 'allow',
          projectId,
        });
        findOne.mockResolvedValue(existing);

        const result = await repository.upsertPosture(projectId, 'deny');

        expect(create).not.toHaveBeenCalled();
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({ id: ruleSetId, posture: 'deny' }),
        );
        expect(result.posture).toBe('deny');
      });
    });
  });

  describe('ensureForProject', () => {
    it('returns the existing rule set without creating one', async () => {
      const existing = skillAvailabilityRuleSetsFactory.build({ projectId });
      findOne.mockResolvedValue(existing);

      await expect(repository.ensureForProject(projectId)).resolves.toBe(
        existing,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('creates one with the default allow posture when absent', async () => {
      await repository.ensureForProject(projectId);

      expect(create).toHaveBeenCalledWith({ posture: 'allow', projectId });
    });
  });

  describe('removeForProject', () => {
    describe('when the project has a live rule set', () => {
      it('soft deletes its live rules and then the rule set in one transaction', async () => {
        managerFindOne.mockResolvedValue(
          skillAvailabilityRuleSetsFactory.build({ id: ruleSetId, projectId }),
        );

        await expect(repository.removeForProject(projectId)).resolves.toBe(
          true,
        );

        expect(managerSoftDelete).toHaveBeenNthCalledWith(
          1,
          SkillAvailabilityRule,
          { deletedAt: IsNull(), ruleSetId },
        );
        expect(managerSoftDelete).toHaveBeenNthCalledWith(
          2,
          SkillAvailabilityRuleSet,
          { deletedAt: IsNull(), id: ruleSetId },
        );
      });
    });

    describe('when the project has no live rule set', () => {
      it('returns false and soft deletes nothing', async () => {
        await expect(repository.removeForProject(projectId)).resolves.toBe(
          false,
        );
        expect(managerSoftDelete).not.toHaveBeenCalled();
      });
    });
  });
});
