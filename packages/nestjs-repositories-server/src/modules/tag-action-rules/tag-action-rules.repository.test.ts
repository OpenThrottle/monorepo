import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TagActionRule } from './tag-action-rule.entity.ts';
import { tagActionRulesFactory } from './tag-action-rules.factory.ts';
import { TagActionRulesRepository } from './tag-action-rules.repository.ts';

const userId = '22222222-2222-4222-8222-222222222222';
const ruleId = '33333333-3333-4333-8333-333333333333';

describe('TagActionRulesRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const softDelete = vi.fn();
  let repository: TagActionRulesRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    softDelete.mockResolvedValue({ affected: 0 });

    const app = await Test.createTestingModule({
      providers: [
        TagActionRulesRepository,
        {
          provide: getRepositoryToken(TagActionRule),
          useValue: createMock<Repository<TagActionRule>>({
            find,
            findOne,
            softDelete,
            target: TagActionRule,
          }),
        },
      ],
    }).compile();

    repository = app.get(TagActionRulesRepository);
  });

  describe('listForUser', () => {
    it('lists the user rules oldest first', async () => {
      const rules = tagActionRulesFactory.buildList(2, { userId });
      find.mockResolvedValue(rules);

      await expect(repository.listForUser(userId)).resolves.toEqual(rules);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { userId },
      });
    });
  });

  describe('findForUser', () => {
    it('scopes the lookup to the owner', async () => {
      const rule = tagActionRulesFactory.build({ id: ruleId, userId });
      findOne.mockResolvedValue(rule);

      await expect(repository.findForUser(userId, ruleId)).resolves.toBe(rule);
      expect(findOne).toHaveBeenCalledWith({ where: { id: ruleId, userId } });
    });

    it('returns null instead of throwing when the rule is absent', async () => {
      await expect(repository.findForUser(userId, ruleId)).resolves.toBeNull();
    });
  });

  describe('listEnabledForUser', () => {
    it('lists only enabled rules oldest first', async () => {
      await repository.listEnabledForUser(userId);

      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { enabled: true, userId },
      });
    });
  });

  describe('removeForUser', () => {
    it('soft deletes the live rule and returns true', async () => {
      softDelete.mockResolvedValue({ affected: 1 });

      await expect(repository.removeForUser(userId, ruleId)).resolves.toBe(
        true,
      );
      expect(softDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: ruleId, userId }),
      );
    });

    it('returns false when no live rule matched', async () => {
      await expect(repository.removeForUser(userId, ruleId)).resolves.toBe(
        false,
      );
    });
  });
});
