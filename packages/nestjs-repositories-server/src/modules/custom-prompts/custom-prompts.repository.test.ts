import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomPrompt } from './custom-prompt.entity.ts';
import { customPromptsFactory } from './custom-prompts.factory.ts';
import { CustomPromptsRepository } from './custom-prompts.repository.ts';
import type { ListCustomPromptsFilter } from './custom-prompts.types.ts';

const promptId = '33333333-3333-4333-8333-333333333333';

const emptyFilter: ListCustomPromptsFilter = {
  includeDeleted: false,
  labels: null,
  projectId: null,
  promptType: null,
  search: null,
  userId: null,
  viewerUserId: undefined,
};

describe('CustomPromptsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const softDelete = vi.fn();
  const restore = vi.fn();
  const deleteRows = vi.fn();
  const getMany = vi.fn();
  const queryBuilder = {
    andWhere: vi.fn().mockReturnThis(),
    getMany,
    orderBy: vi.fn().mockReturnThis(),
    withDeleted: vi.fn().mockReturnThis(),
  };
  let repository: CustomPromptsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    softDelete.mockResolvedValue({ affected: 0 });
    restore.mockResolvedValue({ affected: 0 });
    deleteRows.mockResolvedValue({ affected: 0 });
    getMany.mockResolvedValue([]);

    const app = await Test.createTestingModule({
      providers: [
        CustomPromptsRepository,
        {
          provide: getRepositoryToken(CustomPrompt),
          useValue: createMock<Repository<CustomPrompt>>({
            createQueryBuilder: vi.fn(() => queryBuilder),
            delete: deleteRows,
            find,
            findOne,
            restore,
            softDelete,
            target: CustomPrompt,
          }),
        },
      ],
    }).compile();

    repository = app.get(CustomPromptsRepository);
  });

  describe('listFiltered', () => {
    it('lists only live prompts newest first by default', async () => {
      const rows = customPromptsFactory.buildList(2);
      getMany.mockResolvedValue(rows);

      await expect(repository.listFiltered(emptyFilter)).resolves.toEqual(rows);
      expect(queryBuilder.withDeleted).not.toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.deleted_at IS NULL',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'cp.created_at',
        'DESC',
      );
    });

    it('includes soft-deleted prompts when asked', async () => {
      await repository.listFiltered({ ...emptyFilter, includeDeleted: true });

      expect(queryBuilder.withDeleted).toHaveBeenCalled();
      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'cp.deleted_at IS NULL',
      );
    });

    it('applies every supplied filter', async () => {
      await repository.listFiltered({
        includeDeleted: false,
        labels: ['a'],
        projectId: 'project-1',
        promptType: 'skills',
        search: 'review',
        userId: 'user-1',
        viewerUserId: undefined,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.prompt_type = :promptType',
        { promptType: 'skills' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.labels ?| :labels',
        { labels: ['a'] },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.title ILIKE :search',
        { search: '%review%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.project_id = :projectId',
        { projectId: 'project-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.user_id = :userId',
        { userId: 'user-1' },
      );
    });
  });

  describe('listFiltered visibility scope', () => {
    it('keeps the viewer rows plus system rows', async () => {
      await repository.listFiltered({ ...emptyFilter, viewerUserId: 'u1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(cp.user_id = :viewerUserId OR cp.user_id IS NULL)',
        { viewerUserId: 'u1' },
      );
    });

    it('keeps system rows only for a viewer with no user identity', async () => {
      await repository.listFiltered({ ...emptyFilter, viewerUserId: null });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('cp.user_id IS NULL');
    });

    it('applies no scope when the viewer is undefined', async () => {
      await repository.listFiltered(emptyFilter);

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'cp.user_id IS NULL',
      );
    });
  });

  describe('findIncludingDeleted', () => {
    it('reads past the soft-delete filter', async () => {
      const row = customPromptsFactory.build({ id: promptId });
      findOne.mockResolvedValue(row);

      await expect(repository.findIncludingDeleted(promptId)).resolves.toBe(
        row,
      );
      expect(findOne).toHaveBeenCalledWith({
        where: { id: promptId },
        withDeleted: true,
      });
    });
  });

  describe('findVisibleById', () => {
    it('returns an owned prompt', async () => {
      const row = customPromptsFactory.build({ id: promptId, userId: 'u1' });
      findOne.mockResolvedValue(row);

      await expect(repository.findVisibleById(promptId, 'u1')).resolves.toBe(
        row,
      );
    });

    it('returns a system prompt', async () => {
      const row = customPromptsFactory.build({ id: promptId, userId: null });
      findOne.mockResolvedValue(row);

      await expect(repository.findVisibleById(promptId, 'u1')).resolves.toBe(
        row,
      );
    });

    it('shows a caller with no user identity only system rows', async () => {
      const system = customPromptsFactory.build({ id: promptId, userId: null });
      findOne.mockResolvedValue(system);
      await expect(repository.findVisibleById(promptId, null)).resolves.toBe(
        system,
      );

      findOne.mockResolvedValue(
        customPromptsFactory.build({ id: promptId, userId: 'u1' }),
      );
      await expect(
        repository.findVisibleById(promptId, null),
      ).resolves.toBeNull();
    });

    it('hides another owner prompt', async () => {
      findOne.mockResolvedValue(
        customPromptsFactory.build({ id: promptId, userId: 'u2' }),
      );

      await expect(
        repository.findVisibleById(promptId, 'u1'),
      ).resolves.toBeNull();
    });

    it('returns null when missing or soft deleted', async () => {
      await expect(
        repository.findVisibleById(promptId, 'u1'),
      ).resolves.toBeNull();
    });
  });

  describe('findVisibleByFilePath', () => {
    it('prefers the user-owned row over the system row', async () => {
      const system = customPromptsFactory.build({ userId: null });
      const owned = customPromptsFactory.build({ userId: 'u1' });
      find.mockResolvedValue([system, owned]);

      await expect(
        repository.findVisibleByFilePath('a.md', 'prompts', 'u1'),
      ).resolves.toBe(owned);
    });

    it('falls back to the system row', async () => {
      const system = customPromptsFactory.build({ userId: null });
      find.mockResolvedValue([system]);

      await expect(
        repository.findVisibleByFilePath('a.md', 'prompts', 'u1'),
      ).resolves.toBe(system);
    });

    it('looks at system rows only for a caller with no user identity', async () => {
      find.mockResolvedValue([]);

      await repository.findVisibleByFilePath('a.md', 'prompts', null);

      expect(find).toHaveBeenCalledWith({
        where: [expect.objectContaining({ filePath: 'a.md' })],
      });
    });

    it('returns null when nothing is visible', async () => {
      await expect(
        repository.findVisibleByFilePath('a.md', 'prompts', 'u1'),
      ).resolves.toBeNull();
    });
  });

  describe('softDeleteById', () => {
    it('soft deletes the live prompt and returns true', async () => {
      softDelete.mockResolvedValue({ affected: 1 });

      await expect(repository.softDeleteById(promptId)).resolves.toBe(true);
      expect(softDelete).toHaveBeenCalledWith(
        expect.objectContaining({ id: promptId }),
      );
    });

    it('returns false when no live prompt matched', async () => {
      await expect(repository.softDeleteById(promptId)).resolves.toBe(false);
    });
  });

  describe('restoreById', () => {
    it('clears deleted_at on a deleted prompt and returns it', async () => {
      const row = customPromptsFactory.build({ id: promptId });
      restore.mockResolvedValue({ affected: 1 });
      findOne.mockResolvedValue(row);

      await expect(repository.restoreById(promptId)).resolves.toBe(row);
    });

    it('returns null when the prompt is absent or not deleted', async () => {
      await expect(repository.restoreById(promptId)).resolves.toBeNull();
      expect(findOne).not.toHaveBeenCalled();
    });
  });

  describe('hardDeleteById', () => {
    it('permanently deletes and returns true', async () => {
      deleteRows.mockResolvedValue({ affected: 1 });

      await expect(repository.hardDeleteById(promptId)).resolves.toBe(true);
      expect(deleteRows).toHaveBeenCalledWith({ id: promptId });
    });

    it('returns false when no row matched', async () => {
      await expect(repository.hardDeleteById(promptId)).resolves.toBe(false);
    });
  });
});
