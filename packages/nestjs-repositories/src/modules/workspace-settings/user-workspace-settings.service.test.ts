import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { UserWorkspaceSettings } from './user-workspace-settings.entity';
import { UserWorkspaceSettingsService } from './user-workspace-settings.service';

describe('UserWorkspaceSettingsService', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const mockSettings: UserWorkspaceSettings = {
    contactDisplayName: null,
    contactEmail: null,
    createdAt: new Date('2026-05-18T12:00:00.000Z'),
    enabledEditors: [],
    updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    userId,
  } as UserWorkspaceSettings;

  const mockRepository = {
    create: vi.fn((data: Partial<UserWorkspaceSettings>) => ({
      ...mockSettings,
      ...data,
    })),
    findOne: vi.fn(),
    save: vi.fn((entity: UserWorkspaceSettings) => Promise.resolve(entity)),
  };

  let service: UserWorkspaceSettingsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        UserWorkspaceSettingsService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(UserWorkspaceSettings),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = app.get(UserWorkspaceSettingsService);
  });

  describe('getOrCreateForUser', () => {
    it('returns existing settings when present', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(mockSettings);

      const result = await service.getOrCreateForUser(userId);

      expect(result).toBe(mockSettings);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('creates empty settings when missing', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      const result = await service.getOrCreateForUser(userId);

      expect(mockRepository.create).toHaveBeenCalledWith({
        contactDisplayName: null,
        contactEmail: null,
        enabledEditors: [],
        userId,
      });
      expect(result.userId).toBe(userId);
    });
  });

  describe('updateProfile', () => {
    it('updates contact fields on an existing row', async () => {
      const existing = { ...mockSettings };
      vi.mocked(mockRepository.findOne).mockResolvedValue(existing);

      const result = await service.updateProfile(userId, {
        contactDisplayName: 'Matt',
        contactEmail: 'matt@example.com',
      });

      expect(result.contactDisplayName).toBe('Matt');
      expect(result.contactEmail).toBe('matt@example.com');
      expect(mockRepository.save).toHaveBeenCalledWith(existing);
    });

    it('updates enabled editors on an existing row', async () => {
      const existing = { ...mockSettings };
      vi.mocked(mockRepository.findOne).mockResolvedValue(existing);

      const result = await service.updateProfile(userId, {
        enabledEditors: ['cursor', 'vscode'],
      });

      expect(result.enabledEditors).toEqual(['cursor', 'vscode']);
      expect(mockRepository.save).toHaveBeenCalledWith(existing);
    });

    it('creates settings before updating when missing', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);
      vi.mocked(mockRepository.save).mockImplementation(
        async (entity) => entity,
      );

      await service.updateProfile(userId, {
        contactDisplayName: 'Matt',
      });

      expect(mockRepository.create).toHaveBeenCalled();
    });
  });
});
