import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserFavoriteProject } from './user-favorite-project.entity.ts';
import { userFavoriteProjectsFactory } from './user-favorite-projects.factory.ts';
import { UserFavoriteProjectsRepository } from './user-favorite-projects.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';

describe('UserFavoriteProjectsRepository', () => {
  const execute = vi.fn();
  const find = vi.fn();
  const orIgnore = vi.fn();
  const remove = vi.fn();
  const values = vi.fn();

  let repository: UserFavoriteProjectsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    execute.mockResolvedValue({});
    find.mockResolvedValue([]);
    remove.mockResolvedValue({ affected: 1 });

    const builder = {
      execute,
      insert: vi.fn(() => {
        return builder;
      }),
      orIgnore: orIgnore.mockImplementation(() => {
        return builder;
      }),
      values: values.mockImplementation(() => {
        return builder;
      }),
    };

    const app = await Test.createTestingModule({
      providers: [
        UserFavoriteProjectsRepository,
        {
          provide: getRepositoryToken(UserFavoriteProject),
          useValue: createMock<Repository<UserFavoriteProject>>({
            createQueryBuilder: vi.fn(() => {
              return builder;
            }),
            delete: remove,
            find,
            target: UserFavoriteProject,
          }),
        },
      ],
    }).compile();

    repository = app.get(UserFavoriteProjectsRepository);
  });

  describe('listFavoriteProjectIds', () => {
    it('projects the starred rows into project ids, oldest first', async () => {
      find.mockResolvedValue([
        userFavoriteProjectsFactory.build({ projectId, userId }),
        userFavoriteProjectsFactory.build({ projectId: 'b', userId }),
      ]);

      await expect(repository.listFavoriteProjectIds(userId)).resolves.toEqual([
        projectId,
        'b',
      ]);
      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { userId },
      });
    });

    it('is empty when the user has starred nothing', async () => {
      await expect(repository.listFavoriteProjectIds(userId)).resolves.toEqual(
        [],
      );
    });
  });

  describe('setProjectFavorite', () => {
    describe('when starring', () => {
      it('inserts the row, ignoring a conflict so it is idempotent', async () => {
        await repository.setProjectFavorite(userId, projectId, true);

        expect(values).toHaveBeenCalledWith({ projectId, userId });
        expect(orIgnore).toHaveBeenCalled();
        expect(execute).toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
      });
    });

    describe('when unstarring', () => {
      it('hard deletes the row', async () => {
        await repository.setProjectFavorite(userId, projectId, false);

        expect(remove).toHaveBeenCalledWith({ projectId, userId });
        expect(execute).not.toHaveBeenCalled();
      });
    });
  });
});
