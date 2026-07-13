import { createMock } from '@golevelup/ts-vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  DEFAULT_SKILL_TAG_VOCABULARY,
  DEFAULT_TAG_VOCABULARY_SEED,
} from '@openthrottle/openthrottle-skills';
import { asMock } from '@openthrottle/nestjs-testing';
import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillTagsService } from './skill-tags.service';
import { UserSkillTag } from './user-skill-tag.entity';

describe('SkillTagsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const makeTag = (tag: string): UserSkillTag =>
    asMock<UserSkillTag>({
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      id: `id-${tag}`,
      tag,
      updatedAt: new Date('2026-05-18T12:00:00.000Z'),
      userId,
    });

  const insertBuilder = {
    execute: vi.fn(),
    insert: vi.fn(),
    into: vi.fn(),
    orIgnore: vi.fn(),
    values: vi.fn(),
  };
  insertBuilder.insert.mockReturnValue(insertBuilder);
  insertBuilder.into.mockReturnValue(insertBuilder);
  insertBuilder.values.mockReturnValue(insertBuilder);
  insertBuilder.orIgnore.mockReturnValue(insertBuilder);

  const mockRepository = {
    create: vi.fn((data: Partial<UserSkillTag>) => ({ ...data })),
    createQueryBuilder: vi.fn(() => insertBuilder),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: UserSkillTag) => Promise.resolve(entity)),
  };

  let service: SkillTagsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillTagsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(UserSkillTag),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = app.get(SkillTagsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    insertBuilder.insert.mockReturnValue(insertBuilder);
    insertBuilder.into.mockReturnValue(insertBuilder);
    insertBuilder.values.mockReturnValue(insertBuilder);
    insertBuilder.orIgnore.mockReturnValue(insertBuilder);
  });

  describe('listForUser', () => {
    it('returns existing rows without seeding', async () => {
      const rows = [makeTag('backend'), makeTag('frontend')];
      vi.mocked(mockRepository.find).mockResolvedValue(rows);

      const result = await service.listForUser(userId);

      expect(result).toEqual(rows);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('seeds the default vocabulary when the user has zero rows', async () => {
      vi.mocked(mockRepository.find)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(
          DEFAULT_SKILL_TAG_VOCABULARY.map((tag) => makeTag(tag)),
        );

      const result = await service.listForUser(userId);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(insertBuilder.values).toHaveBeenCalledWith(
        DEFAULT_TAG_VOCABULARY_SEED.map(({ dimension, tag }) => ({
          dimension,
          tag,
          userId,
        })),
      );
      expect(insertBuilder.orIgnore).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(DEFAULT_SKILL_TAG_VOCABULARY.length);
      expect(mockRepository.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('addTag', () => {
    it('persists a normalized kebab-case tag', async () => {
      const saved = makeTag('pr-review');
      vi.mocked(mockRepository.save).mockResolvedValue(saved);

      const result = await service.addTag(userId, '  pr-review  ');

      expect(result).toBe(saved);
      expect(mockRepository.create).toHaveBeenCalledWith({
        dimension: 'domain',
        tag: 'pr-review',
        userId,
      });
    });

    it('throws BadRequestException for a non-kebab-case tag', async () => {
      await expect(service.addTag(userId, 'PR Review')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException on duplicate tag', async () => {
      const uniqueError = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      vi.mocked(mockRepository.save).mockRejectedValue(uniqueError);

      await expect(service.addTag(userId, 'backend')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('renameTag', () => {
    it('throws NotFoundException when the source tag is absent', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);

      await expect(
        service.renameTag(userId, 'missing', 'renamed'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('renames an existing tag', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(makeTag('backend'));
      vi.mocked(mockRepository.save).mockImplementation(async (e) => e);

      const result = await service.renameTag(userId, 'backend', 'server');

      expect(result.tag).toBe('server');
    });

    it('is a no-op when renaming to the same tag', async () => {
      const existing = makeTag('backend');
      vi.mocked(mockRepository.findOne).mockResolvedValue(existing);

      const result = await service.renameTag(userId, 'backend', 'backend');

      expect(result).toBe(existing);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for a non-kebab-case target', async () => {
      await expect(
        service.renameTag(userId, 'backend', 'Not Valid'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when the target already exists', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(makeTag('backend'));
      const uniqueError = new QueryFailedError(
        'UPDATE',
        [],
        Object.assign(new Error('duplicate'), { code: '23505' }),
      );
      vi.mocked(mockRepository.save).mockRejectedValue(uniqueError);

      await expect(
        service.renameTag(userId, 'backend', 'frontend'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('removeTag', () => {
    it('returns true when a row is removed', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1 });

      await expect(service.removeTag(userId, 'backend')).resolves.toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith({
        tag: 'backend',
        userId,
      });
    });

    it('returns false when no row is removed', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 0 });

      await expect(service.removeTag(userId, 'missing')).resolves.toBe(false);
    });
  });
});
