import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity.ts';
import { userFavoriteAgentModelsFactory } from './user-favorite-agent-models.factory.ts';
import { UserFavoriteAgentModelsRepository } from './user-favorite-agent-models.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('UserFavoriteAgentModelsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const remove = vi.fn();

  let repository: UserFavoriteAgentModelsRepository;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    remove.mockResolvedValue({ affected: 1 });

    const app = await Test.createTestingModule({
      providers: [
        UserFavoriteAgentModelsRepository,
        {
          provide: getRepositoryToken(UserFavoriteAgentModel),
          useValue: createMock<Repository<UserFavoriteAgentModel>>({
            delete: remove,
            find,
            findOne,
            target: UserFavoriteAgentModel,
          }),
        },
      ],
    }).compile();

    repository = app.get(UserFavoriteAgentModelsRepository);
  });

  describe('getFavoriteModels', () => {
    it('projects favorite rows into a backend → set map', async () => {
      find.mockResolvedValue([
        { backend: 'claude', model: 'opus', userId },
        { backend: 'cursor', model: 'gpt-5', userId },
      ]);

      const map = await repository.getFavoriteModels(userId);

      expect(map.get('claude')).toEqual(new Set(['opus']));
      expect(map.get('cursor')).toEqual(new Set(['gpt-5']));
      expect(find).toHaveBeenCalledWith({ where: { userId } });
    });
  });

  describe('isFavoriteModel', () => {
    describe('when a favorite row exists', () => {
      it('is true', async () => {
        findOne.mockResolvedValue(userFavoriteAgentModelsFactory.build());

        await expect(
          repository.isFavoriteModel(userId, 'claude', 'opus'),
        ).resolves.toBe(true);
      });
    });

    describe('when no favorite row exists', () => {
      it('is false', async () => {
        await expect(
          repository.isFavoriteModel(userId, 'claude', 'opus'),
        ).resolves.toBe(false);
      });
    });
  });

  describe('setModelFavorite', () => {
    describe('when starring', () => {
      it('inserts a favorite row', async () => {
        const create = vi
          .spyOn(repository, 'create')
          .mockResolvedValue(userFavoriteAgentModelsFactory.build());

        await repository.setModelFavorite(userId, 'claude', 'opus', true);

        expect(create).toHaveBeenCalledWith({
          backend: 'claude',
          model: 'opus',
          userId,
        });
      });

      it('is idempotent when the model is already a favorite', async () => {
        findOne.mockResolvedValue(userFavoriteAgentModelsFactory.build());
        const create = vi.spyOn(repository, 'create');

        await repository.setModelFavorite(userId, 'claude', 'opus', true);

        expect(create).not.toHaveBeenCalled();
      });
    });

    describe('when unstarring', () => {
      it('hard deletes the favorite row', async () => {
        await repository.setModelFavorite(userId, 'claude', 'opus', false);

        expect(remove).toHaveBeenCalledWith({
          backend: 'claude',
          model: 'opus',
          userId,
        });
      });
    });
  });
});
