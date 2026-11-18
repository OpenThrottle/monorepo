import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserWorkspaceSettings } from './user-workspace-settings.entity.ts';
import { userWorkspaceSettingsFactory } from './user-workspace-settings.factory.ts';
import { UserWorkspaceSettingsRepository } from './user-workspace-settings.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('UserWorkspaceSettingsRepository', () => {
  const create = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();

  let repository: UserWorkspaceSettingsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<UserWorkspaceSettings>) => {
      return { ...data };
    });
    findOne.mockResolvedValue(null);
    save.mockImplementation(async (entity: UserWorkspaceSettings) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        UserWorkspaceSettingsRepository,
        {
          provide: getRepositoryToken(UserWorkspaceSettings),
          useValue: createMock<Repository<UserWorkspaceSettings>>({
            create,
            findOne,
            save,
            target: UserWorkspaceSettings,
          }),
        },
      ],
    }).compile();

    repository = app.get(UserWorkspaceSettingsRepository);
  });

  describe('findByUserId', () => {
    describe('when the user has no row', () => {
      it('returns null without inserting', async () => {
        await expect(repository.findByUserId(userId)).resolves.toBeNull();
        expect(findOne).toHaveBeenCalledWith({ where: { userId } });
        expect(save).not.toHaveBeenCalled();
      });
    });
  });

  describe('getOrCreateForUser', () => {
    describe('when a row exists', () => {
      it('returns it without creating', async () => {
        const existing = userWorkspaceSettingsFactory.build({ userId });
        findOne.mockResolvedValue(existing);

        await expect(repository.getOrCreateForUser(userId)).resolves.toBe(
          existing,
        );
        expect(create).not.toHaveBeenCalled();
      });
    });

    describe('when no row exists', () => {
      it('saves an empty row for the user', async () => {
        const result = await repository.getOrCreateForUser(userId);

        expect(create).toHaveBeenCalledWith({
          contactDisplayName: null,
          contactEmail: null,
          enabledEditors: [],
          userId,
        });
        expect(result.userId).toBe(userId);
      });
    });
  });

  describe('updateProfile', () => {
    describe('when a row exists', () => {
      it('updates the contact fields', async () => {
        const existing = userWorkspaceSettingsFactory.build({ userId });
        findOne.mockResolvedValue(existing);

        const result = await repository.updateProfile(userId, {
          contactDisplayName: 'Matt',
          contactEmail: 'matt@example.com',
        });

        expect(result.contactDisplayName).toBe('Matt');
        expect(result.contactEmail).toBe('matt@example.com');
        expect(save).toHaveBeenCalledWith(existing);
      });

      it('updates enabled editors and leaves undefined keys unchanged', async () => {
        const existing = userWorkspaceSettingsFactory.build({
          contactDisplayName: 'Keep',
          userId,
        });
        findOne.mockResolvedValue(existing);

        const result = await repository.updateProfile(userId, {
          enabledEditors: ['cursor', 'vscode'],
        });

        expect(result.enabledEditors).toEqual(['cursor', 'vscode']);
        expect(result.contactDisplayName).toBe('Keep');
      });
    });

    describe('when no row exists', () => {
      it('creates it before updating', async () => {
        await repository.updateProfile(userId, { contactDisplayName: 'Matt' });

        expect(create).toHaveBeenCalled();
        expect(save).toHaveBeenLastCalledWith(
          expect.objectContaining({ contactDisplayName: 'Matt', userId }),
        );
      });
    });
  });

  describe('updateContactProfile', () => {
    it('delegates to updateProfile', async () => {
      await repository.updateContactProfile(userId, { contactEmail: 'a@b.c' });

      expect(save).toHaveBeenLastCalledWith(
        expect.objectContaining({ contactEmail: 'a@b.c' }),
      );
    });
  });
});
