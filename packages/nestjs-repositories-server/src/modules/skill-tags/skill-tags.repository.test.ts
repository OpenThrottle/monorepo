import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DEFAULT_SKILL_TAG_VOCABULARY,
  DEFAULT_TAG_VOCABULARY_SEED,
} from '@openthrottle/openthrottle-skills';
import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { skillTagsFactory } from './skill-tags.factory.ts';
import { SkillTagsRepository } from './skill-tags.repository.ts';
import { UserSkillTag } from './user-skill-tag.entity.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const uniqueViolation = (): QueryFailedError => {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate'), { code: '23505' }),
  );
};

describe('SkillTagsRepository', () => {
  const create = vi.fn();
  const remove = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();
  const insertBuilder = {
    execute: vi.fn(),
    insert: vi.fn(),
    into: vi.fn(),
    orIgnore: vi.fn(),
    values: vi.fn(),
  };

  let repository: SkillTagsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<UserSkillTag>) => {
      return { ...data };
    });
    remove.mockResolvedValue({ affected: 1 });
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    save.mockImplementation(async (entity: UserSkillTag) => {
      return entity;
    });
    insertBuilder.execute.mockResolvedValue({});
    insertBuilder.insert.mockReturnValue(insertBuilder);
    insertBuilder.into.mockReturnValue(insertBuilder);
    insertBuilder.orIgnore.mockReturnValue(insertBuilder);
    insertBuilder.values.mockReturnValue(insertBuilder);

    const app = await Test.createTestingModule({
      providers: [
        SkillTagsRepository,
        {
          provide: getRepositoryToken(UserSkillTag),
          useValue: createMock<Repository<UserSkillTag>>({
            create,
            createQueryBuilder: vi.fn(() => {
              return insertBuilder;
            }),
            delete: remove,
            find,
            findOne,
            save,
            target: UserSkillTag,
          }),
        },
      ],
    }).compile();

    repository = app.get(SkillTagsRepository);
  });

  describe('listForUser', () => {
    describe('when the user has tags', () => {
      it('returns them without seeding', async () => {
        const rows = skillTagsFactory.buildList(2, { userId });
        find.mockResolvedValue(rows);

        await expect(repository.listForUser(userId)).resolves.toEqual(rows);
        expect(find).toHaveBeenCalledTimes(1);
        expect(find).toHaveBeenCalledWith({
          order: { tag: 'ASC' },
          where: { userId },
        });
        expect(insertBuilder.insert).not.toHaveBeenCalled();
      });
    });

    describe('when the user has zero tags', () => {
      it('seeds the default vocabulary, then reads it back', async () => {
        const seeded = DEFAULT_SKILL_TAG_VOCABULARY.map((tag) => {
          return skillTagsFactory.build({ tag, userId });
        });
        find.mockResolvedValueOnce([]).mockResolvedValueOnce(seeded);

        const result = await repository.listForUser(userId);

        expect(insertBuilder.values).toHaveBeenCalledWith(
          DEFAULT_TAG_VOCABULARY_SEED.map(({ dimension, tag }) => {
            return { dimension, tag, userId };
          }),
        );
        expect(insertBuilder.orIgnore).toHaveBeenCalledTimes(1);
        expect(result).toHaveLength(DEFAULT_SKILL_TAG_VOCABULARY.length);
        expect(find).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('addTag', () => {
    describe('when the tag is a kebab-case slug', () => {
      it('persists the trimmed tag as a domain tag', async () => {
        const result = await repository.addTag(userId, '  pr-review  ');

        expect(result).toEqual({
          kind: 'ok',
          value: { dimension: 'domain', tag: 'pr-review', userId },
        });
        expect(create).toHaveBeenCalledWith({
          dimension: 'domain',
          tag: 'pr-review',
          userId,
        });
      });
    });

    describe('when the tag is not kebab-case', () => {
      it('throws BadRequestException without saving', async () => {
        await expect(
          repository.addTag(userId, 'PR Review'),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(save).not.toHaveBeenCalled();
      });
    });

    describe('when the dimension is unknown', () => {
      it('throws BadRequestException', async () => {
        await expect(
          repository.addTag(userId, 'backend', 'season'),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('when the user already has the tag', () => {
      it('returns a conflict result naming the normalized tag', async () => {
        save.mockRejectedValue(uniqueViolation());

        await expect(repository.addTag(userId, '  backend ')).resolves.toEqual({
          kind: 'conflict',
          tag: 'backend',
        });
      });
    });

    describe('when the save fails for another reason', () => {
      it('rethrows the error', async () => {
        const failure = new Error('connection reset');
        save.mockRejectedValue(failure);

        await expect(repository.addTag(userId, 'backend')).rejects.toBe(
          failure,
        );
      });
    });
  });

  describe('renameTag', () => {
    describe('when the source tag is absent', () => {
      it('throws NotFoundException', async () => {
        await expect(
          repository.renameTag(userId, 'missing', 'renamed'),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('when the source tag exists', () => {
      it('renames it', async () => {
        findOne.mockResolvedValue(
          skillTagsFactory.build({ tag: 'backend', userId }),
        );

        const result = await repository.renameTag(userId, 'backend', 'server');

        expect(result).toMatchObject({ kind: 'ok', value: { tag: 'server' } });
      });

      it('is a no-op when renaming to the same tag', async () => {
        const existing = skillTagsFactory.build({ tag: 'backend', userId });
        findOne.mockResolvedValue(existing);

        await expect(
          repository.renameTag(userId, 'backend', 'backend'),
        ).resolves.toEqual({ kind: 'ok', value: existing });
        expect(save).not.toHaveBeenCalled();
      });

      it('returns a conflict result when the target already exists', async () => {
        findOne.mockResolvedValue(
          skillTagsFactory.build({ tag: 'backend', userId }),
        );
        save.mockRejectedValue(uniqueViolation());

        await expect(
          repository.renameTag(userId, 'backend', 'frontend'),
        ).resolves.toEqual({ kind: 'conflict', tag: 'frontend' });
      });
    });

    describe('when the target is not kebab-case', () => {
      it('throws BadRequestException', async () => {
        await expect(
          repository.renameTag(userId, 'backend', 'Not Valid'),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });
  });

  describe('removeTag', () => {
    describe('when a row is removed', () => {
      it('hard deletes it and returns true', async () => {
        await expect(repository.removeTag(userId, 'backend')).resolves.toBe(
          true,
        );
        expect(remove).toHaveBeenCalledWith({ tag: 'backend', userId });
      });
    });

    describe('when no row is removed', () => {
      it('returns false', async () => {
        remove.mockResolvedValue({ affected: 0 });

        await expect(repository.removeTag(userId, 'missing')).resolves.toBe(
          false,
        );
      });
    });
  });
});
