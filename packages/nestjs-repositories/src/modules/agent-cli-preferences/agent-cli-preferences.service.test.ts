import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { IsNull, Not } from 'typeorm';
import { AgentCliPreferencesService } from './agent-cli-preferences.service';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity';
import { UserFavoriteAgentModel } from './user-favorite-agent-model.entity';

const userId = '11111111-1111-4111-8111-111111111111';
const rowId = '22222222-2222-4222-8222-222222222222';

describe('AgentCliPreferencesService', () => {
  type MockRepo = {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const makeRepo = (): MockRepo => ({
    create: vi.fn((data: Record<string, unknown>) => data),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    save: vi.fn(async (entity: Record<string, unknown>) => ({
      ...entity,
      createdAt: new Date(),
      id: rowId,
    })),
  });

  let service: AgentCliPreferencesService;
  let disabledRepository: MockRepo;
  let favoriteRepository: MockRepo;

  beforeEach(async () => {
    disabledRepository = makeRepo();
    favoriteRepository = makeRepo();

    const app = await Test.createTestingModule({
      providers: [
        AgentCliPreferencesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(UserDisabledAgentCli),
          useValue: disabledRepository,
        },
        {
          provide: getRepositoryToken(UserFavoriteAgentModel),
          useValue: favoriteRepository,
        },
      ],
    }).compile();

    service = app.get(AgentCliPreferencesService);
  });

  // ── Agent-level enablement (model IS NULL) ──────────────────────────────

  describe('getDisabledBackends', () => {
    it('returns an empty set when the user has disabled nothing', async () => {
      disabledRepository.find.mockResolvedValue([]);
      await expect(service.getDisabledBackends(userId)).resolves.toEqual(
        new Set(),
      );
    });

    it('queries only agent-level (model IS NULL) rows', async () => {
      disabledRepository.find.mockResolvedValue([
        { backend: 'claude', model: null, userId },
        { backend: 'grok', model: null, userId },
      ]);
      const disabled = await service.getDisabledBackends(userId);
      expect(disabled).toEqual(new Set(['claude', 'grok']));
      expect(disabledRepository.find).toHaveBeenCalledWith({
        where: { model: IsNull(), userId },
      });
    });
  });

  describe('isEnabled', () => {
    it('is enabled when no agent-level disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await expect(service.isEnabled(userId, 'claude')).resolves.toBe(true);
      expect(disabledRepository.findOne).toHaveBeenCalledWith({
        where: { backend: 'claude', model: IsNull(), userId },
      });
    });

    it('is disabled when an agent-level disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: null,
        userId,
      });
      await expect(service.isEnabled(userId, 'claude')).resolves.toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('deletes only the agent-level disable row when enabling', async () => {
      await service.setEnabled(userId, 'claude', true);
      expect(disabledRepository.delete).toHaveBeenCalledWith({
        backend: 'claude',
        model: IsNull(),
        userId,
      });
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });

    it('inserts an agent-level (model null) disable row when disabling', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await service.setEnabled(userId, 'claude', false);
      expect(disabledRepository.save).toHaveBeenCalledOnce();
      expect(disabledRepository.create).toHaveBeenCalledWith({
        backend: 'claude',
        model: null,
        userId,
      });
    });

    it('is idempotent when disabling an already-disabled agent', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: null,
        userId,
      });
      await service.setEnabled(userId, 'claude', false);
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── Per-model enablement (non-null model) ───────────────────────────────

  describe('getDisabledModels', () => {
    it('projects non-null model rows into a backend → set map, ignoring agent-level rows', async () => {
      disabledRepository.find.mockResolvedValue([
        { backend: 'claude', model: null, userId },
        { backend: 'claude', model: 'opus', userId },
        { backend: 'claude', model: 'haiku', userId },
        { backend: 'cursor', model: 'gpt-5', userId },
      ]);
      const map = await service.getDisabledModels(userId);
      expect(map.get('claude')).toEqual(new Set(['opus', 'haiku']));
      expect(map.get('cursor')).toEqual(new Set(['gpt-5']));
    });
  });

  describe('isModelEnabled', () => {
    it('is enabled when no per-model disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await expect(
        service.isModelEnabled(userId, 'claude', 'opus'),
      ).resolves.toBe(true);
      expect(disabledRepository.findOne).toHaveBeenCalledWith({
        where: { backend: 'claude', model: 'opus', userId },
      });
    });

    it('is disabled when a per-model disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: 'opus',
        userId,
      });
      await expect(
        service.isModelEnabled(userId, 'claude', 'opus'),
      ).resolves.toBe(false);
    });
  });

  describe('setModelEnabled', () => {
    it('deletes the per-model disable row when enabling', async () => {
      await service.setModelEnabled(userId, 'claude', 'opus', true);
      expect(disabledRepository.delete).toHaveBeenCalledWith({
        backend: 'claude',
        model: 'opus',
        userId,
      });
    });

    it('inserts a per-model disable row when disabling', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await service.setModelEnabled(userId, 'claude', 'opus', false);
      expect(disabledRepository.create).toHaveBeenCalledWith({
        backend: 'claude',
        model: 'opus',
        userId,
      });
    });

    it('is idempotent when disabling an already-disabled model', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: 'opus',
        userId,
      });
      await service.setModelEnabled(userId, 'claude', 'opus', false);
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('setModelsEnabled', () => {
    it('clears every per-model disable row (model NOT NULL) when enabling all', async () => {
      await service.setModelsEnabled(userId, 'cursor', ['a', 'b'], true);
      expect(disabledRepository.delete).toHaveBeenCalledWith({
        backend: 'cursor',
        model: Not(IsNull()),
        userId,
      });
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });

    it('inserts a disable row for each not-yet-disabled model when disabling all', async () => {
      disabledRepository.find.mockResolvedValue([
        { backend: 'cursor', model: 'a', userId },
      ]);
      await service.setModelsEnabled(userId, 'cursor', ['a', 'b', 'c'], false);
      expect(disabledRepository.save).toHaveBeenCalledWith([
        { backend: 'cursor', model: 'b', userId },
        { backend: 'cursor', model: 'c', userId },
      ]);
    });

    it('does not save when every model is already disabled', async () => {
      disabledRepository.find.mockResolvedValue([
        { backend: 'cursor', model: 'a', userId },
        { backend: 'cursor', model: 'b', userId },
      ]);
      await service.setModelsEnabled(userId, 'cursor', ['a', 'b'], false);
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });
  });

  // ── Per-model favorites ─────────────────────────────────────────────────

  describe('getFavoriteModels', () => {
    it('projects favorite rows into a backend → set map', async () => {
      favoriteRepository.find.mockResolvedValue([
        { backend: 'claude', model: 'opus', userId },
        { backend: 'cursor', model: 'gpt-5', userId },
      ]);
      const map = await service.getFavoriteModels(userId);
      expect(map.get('claude')).toEqual(new Set(['opus']));
      expect(map.get('cursor')).toEqual(new Set(['gpt-5']));
    });
  });

  describe('isFavoriteModel', () => {
    it('is true when a favorite row exists', async () => {
      favoriteRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: 'opus',
        userId,
      });
      await expect(
        service.isFavoriteModel(userId, 'claude', 'opus'),
      ).resolves.toBe(true);
    });

    it('is false when no favorite row exists', async () => {
      favoriteRepository.findOne.mockResolvedValue(null);
      await expect(
        service.isFavoriteModel(userId, 'claude', 'opus'),
      ).resolves.toBe(false);
    });
  });

  describe('setModelFavorite', () => {
    it('inserts a favorite row when starring', async () => {
      favoriteRepository.findOne.mockResolvedValue(null);
      await service.setModelFavorite(userId, 'claude', 'opus', true);
      expect(favoriteRepository.create).toHaveBeenCalledWith({
        backend: 'claude',
        model: 'opus',
        userId,
      });
      expect(favoriteRepository.save).toHaveBeenCalledOnce();
    });

    it('is idempotent when starring an already-favorited model', async () => {
      favoriteRepository.findOne.mockResolvedValue({
        backend: 'claude',
        model: 'opus',
        userId,
      });
      await service.setModelFavorite(userId, 'claude', 'opus', true);
      expect(favoriteRepository.save).not.toHaveBeenCalled();
    });

    it('deletes the favorite row when unstarring', async () => {
      await service.setModelFavorite(userId, 'claude', 'opus', false);
      expect(favoriteRepository.delete).toHaveBeenCalledWith({
        backend: 'claude',
        model: 'opus',
        userId,
      });
    });
  });
});
