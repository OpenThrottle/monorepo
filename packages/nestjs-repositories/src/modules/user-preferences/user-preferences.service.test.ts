import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_PREFERENCES_ERROR_REASONS } from './user-preferences.constants.ts';
import { UserPreferences } from './user-preferences.entity.ts';
import { UserPreferencesService } from './user-preferences.service.ts';

const userId = '11111111-1111-4111-8111-111111111111';

interface MockRepo {
  readonly create: ReturnType<typeof vi.fn>;
  readonly findOne: ReturnType<typeof vi.fn>;
  readonly save: ReturnType<typeof vi.fn>;
}

const makeRow = (overrides: Partial<UserPreferences>): UserPreferences => {
  const row = new UserPreferences();
  row.userId = userId;
  row.defaultEditor = null;
  row.defaultAgentBackend = null;
  row.defaultAgentModel = null;
  row.defaultAgentEffort = null;
  return Object.assign(row, overrides);
};

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let repository: MockRepo;

  beforeEach(async () => {
    repository = {
      create: vi.fn((data: Partial<UserPreferences>) => makeRow(data)),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (row: UserPreferences) => row),
    };

    const app = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(UserPreferences),
          useValue: repository,
        },
      ],
    }).compile();

    service = app.get(UserPreferencesService);
  });

  describe('getForUser', () => {
    describe('when the user has no row', () => {
      it('returns all-NULL preferences without inserting', async () => {
        await expect(service.getForUser(userId)).resolves.toEqual({
          defaultAgent: null,
          defaultEditor: null,
          userId,
        });
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });
    });

    describe('when the user has a row', () => {
      it('returns the narrowed row', async () => {
        repository.findOne.mockResolvedValue(
          makeRow({
            defaultAgentBackend: 'claude',
            defaultAgentEffort: 'high',
            defaultAgentModel: 'opus',
            defaultEditor: 'cursor',
          }),
        );
        await expect(service.getForUser(userId)).resolves.toEqual({
          defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
          defaultEditor: 'cursor',
          userId,
        });
        expect(repository.findOne).toHaveBeenCalledWith({ where: { userId } });
      });
    });
  });

  describe('update', () => {
    describe('when the patch is invalid', () => {
      it('returns the failure and writes nothing', async () => {
        const result = await service.update(userId, { defaultEditor: 'emacs' });
        expect(result).toMatchObject({
          ok: false,
          reason: USER_PREFERENCES_ERROR_REASONS.invalidEditor,
        });
        expect(repository.findOne).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });
    });

    describe('when the user has no row', () => {
      it('inserts a row with only the patched preference set', async () => {
        const result = await service.update(userId, {
          defaultEditor: 'cursor',
        });
        expect(repository.create).toHaveBeenCalledOnce();
        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultAgentBackend: null,
            defaultAgentModel: null,
            defaultEditor: 'cursor',
            userId,
          }),
        );
        expect(result).toEqual({
          ok: true,
          preferences: { defaultAgent: null, defaultEditor: 'cursor', userId },
        });
      });
    });

    describe('when the user has a row', () => {
      it('updates the patched key and leaves undefined keys unchanged', async () => {
        repository.findOne.mockResolvedValue(
          makeRow({
            defaultAgentBackend: 'claude',
            defaultAgentEffort: 'high',
            defaultAgentModel: 'opus',
            defaultEditor: 'vscode',
          }),
        );
        const result = await service.update(userId, {
          defaultEditor: 'cursor',
        });
        expect(repository.create).not.toHaveBeenCalled();
        expect(result).toEqual({
          ok: true,
          preferences: {
            defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
            defaultEditor: 'cursor',
            userId,
          },
        });
      });

      it('sets backend, model and effort together', async () => {
        repository.findOne.mockResolvedValue(
          makeRow({ defaultEditor: 'vscode' }),
        );
        await service.update(userId, {
          defaultAgent: { backend: 'codex', effort: 'low', model: 'gpt-5.2' },
        });
        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultAgentBackend: 'codex',
            defaultAgentEffort: 'low',
            defaultAgentModel: 'gpt-5.2',
            defaultEditor: 'vscode',
          }),
        );
      });

      it('clears the editor on null', async () => {
        repository.findOne.mockResolvedValue(
          makeRow({ defaultEditor: 'cursor' }),
        );
        const result = await service.update(userId, { defaultEditor: null });
        expect(result).toMatchObject({
          ok: true,
          preferences: { defaultEditor: null },
        });
      });

      it('clears backend, model and effort on a null agent', async () => {
        repository.findOne.mockResolvedValue(
          makeRow({
            defaultAgentBackend: 'claude',
            defaultAgentEffort: 'high',
            defaultAgentModel: 'opus',
            defaultEditor: 'cursor',
          }),
        );
        await service.update(userId, { defaultAgent: null });
        expect(repository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultAgentBackend: null,
            defaultAgentEffort: null,
            defaultAgentModel: null,
            defaultEditor: 'cursor',
          }),
        );
      });
    });
  });
});
