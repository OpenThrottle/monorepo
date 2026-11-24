import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { IsNull, Not } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity.ts';
import { userDisabledAgentClisFactory } from './user-disabled-agent-clis.factory.ts';
import { UserDisabledAgentClisRepository } from './user-disabled-agent-clis.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('UserDisabledAgentClisRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const remove = vi.fn();

  let repository: UserDisabledAgentClisRepository;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    remove.mockResolvedValue({ affected: 1 });

    const app = await Test.createTestingModule({
      providers: [
        UserDisabledAgentClisRepository,
        {
          provide: getRepositoryToken(UserDisabledAgentCli),
          useValue: createMock<Repository<UserDisabledAgentCli>>({
            delete: remove,
            find,
            findOne,
            target: UserDisabledAgentCli,
          }),
        },
      ],
    }).compile();

    repository = app.get(UserDisabledAgentClisRepository);
  });

  // ── Agent-level enablement (model IS NULL) ──────────────────────────────

  describe('getDisabledDrivers', () => {
    it('reads only agent-level rows into a set of drivers', async () => {
      find.mockResolvedValue(
        userDisabledAgentClisFactory.buildList(2, { userId }).map((row, i) => {
          return { ...row, driver: i === 0 ? 'claude' : 'grok' };
        }),
      );

      await expect(repository.getDisabledDrivers(userId)).resolves.toEqual(
        new Set(['claude', 'grok']),
      );
      expect(find).toHaveBeenCalledWith({
        where: { model: IsNull(), userId },
      });
    });
  });

  describe('isEnabled', () => {
    describe('when no agent-level disable row exists', () => {
      it('is enabled', async () => {
        await expect(repository.isEnabled(userId, 'claude')).resolves.toBe(
          true,
        );
        expect(findOne).toHaveBeenCalledWith({
          where: { driver: 'claude', model: IsNull(), userId },
        });
      });
    });

    describe('when an agent-level disable row exists', () => {
      it('is disabled', async () => {
        findOne.mockResolvedValue(
          userDisabledAgentClisFactory.build({ driver: 'claude', userId }),
        );

        await expect(repository.isEnabled(userId, 'claude')).resolves.toBe(
          false,
        );
      });
    });
  });

  describe('setEnabled', () => {
    describe('when enabling', () => {
      it('hard deletes only the agent-level row', async () => {
        await repository.setEnabled(userId, 'claude', true);

        expect(remove).toHaveBeenCalledWith({
          driver: 'claude',
          model: IsNull(),
          userId,
        });
      });
    });

    describe('when disabling', () => {
      it('inserts an agent-level row', async () => {
        const create = vi
          .spyOn(repository, 'create')
          .mockResolvedValue(userDisabledAgentClisFactory.build());

        await repository.setEnabled(userId, 'claude', false);

        expect(create).toHaveBeenCalledWith({
          driver: 'claude',
          model: null,
          userId,
        });
      });

      it('is idempotent when the agent is already disabled', async () => {
        findOne.mockResolvedValue(userDisabledAgentClisFactory.build());
        const create = vi.spyOn(repository, 'create');

        await repository.setEnabled(userId, 'claude', false);

        expect(create).not.toHaveBeenCalled();
      });
    });
  });

  // ── Per-model enablement (non-null model) ───────────────────────────────

  describe('getDisabledModels', () => {
    it('projects model rows into a driver → set map, ignoring agent-level rows', async () => {
      find.mockResolvedValue([
        { driver: 'claude', model: null, userId },
        { driver: 'claude', model: 'opus', userId },
        { driver: 'claude', model: 'haiku', userId },
        { driver: 'cursor', model: 'gpt-5', userId },
      ]);

      const map = await repository.getDisabledModels(userId);

      expect(map.get('claude')).toEqual(new Set(['opus', 'haiku']));
      expect(map.get('cursor')).toEqual(new Set(['gpt-5']));
    });
  });

  describe('isModelEnabled', () => {
    describe('when no per-model disable row exists', () => {
      it('is enabled', async () => {
        await expect(
          repository.isModelEnabled(userId, 'claude', 'opus'),
        ).resolves.toBe(true);
        expect(findOne).toHaveBeenCalledWith({
          where: { driver: 'claude', model: 'opus', userId },
        });
      });
    });

    describe('when a per-model disable row exists', () => {
      it('is disabled', async () => {
        findOne.mockResolvedValue(
          userDisabledAgentClisFactory.build({ model: 'opus' }),
        );

        await expect(
          repository.isModelEnabled(userId, 'claude', 'opus'),
        ).resolves.toBe(false);
      });
    });
  });

  describe('setModelEnabled', () => {
    describe('when enabling', () => {
      it('hard deletes the per-model row', async () => {
        await repository.setModelEnabled(userId, 'claude', 'opus', true);

        expect(remove).toHaveBeenCalledWith({
          driver: 'claude',
          model: 'opus',
          userId,
        });
      });
    });

    describe('when disabling', () => {
      it('inserts a per-model row', async () => {
        const create = vi
          .spyOn(repository, 'create')
          .mockResolvedValue(userDisabledAgentClisFactory.build());

        await repository.setModelEnabled(userId, 'claude', 'opus', false);

        expect(create).toHaveBeenCalledWith({
          driver: 'claude',
          model: 'opus',
          userId,
        });
      });

      it('is idempotent when the model is already disabled', async () => {
        findOne.mockResolvedValue(
          userDisabledAgentClisFactory.build({ model: 'opus' }),
        );
        const create = vi.spyOn(repository, 'create');

        await repository.setModelEnabled(userId, 'claude', 'opus', false);

        expect(create).not.toHaveBeenCalled();
      });
    });
  });

  describe('setModelsEnabled', () => {
    describe('when enabling', () => {
      it('clears every per-model row for the driver', async () => {
        await repository.setModelsEnabled(userId, 'cursor', ['a', 'b'], true);

        expect(remove).toHaveBeenCalledWith({
          driver: 'cursor',
          model: Not(IsNull()),
          userId,
        });
      });
    });

    describe('when disabling', () => {
      it('inserts a row for each not-yet-disabled model', async () => {
        find.mockResolvedValue([{ driver: 'cursor', model: 'a', userId }]);
        const createMany = vi
          .spyOn(repository, 'createMany')
          .mockResolvedValue([]);

        await repository.setModelsEnabled(
          userId,
          'cursor',
          ['a', 'b', 'c'],
          false,
        );

        expect(createMany).toHaveBeenCalledWith([
          { driver: 'cursor', model: 'b', userId },
          { driver: 'cursor', model: 'c', userId },
        ]);
      });

      it('inserts nothing when every model is already disabled', async () => {
        find.mockResolvedValue([
          { driver: 'cursor', model: 'a', userId },
          { driver: 'cursor', model: 'b', userId },
        ]);
        const createMany = vi.spyOn(repository, 'createMany');

        await repository.setModelsEnabled(userId, 'cursor', ['a', 'b'], false);

        expect(createMany).not.toHaveBeenCalled();
      });
    });
  });
});
