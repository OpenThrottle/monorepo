import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentCliPreferencesService } from './agent-cli-preferences.service';
import { UserDisabledAgentCli } from './user-disabled-agent-cli.entity';

const userId = '11111111-1111-4111-8111-111111111111';
const rowId = '22222222-2222-4222-8222-222222222222';

describe('AgentCliPreferencesService', () => {
  type DisabledRepo = {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: AgentCliPreferencesService;
  let disabledRepository: DisabledRepo;

  beforeEach(async () => {
    disabledRepository = {
      create: vi.fn((data: Partial<UserDisabledAgentCli>) => data),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (entity: UserDisabledAgentCli) => ({
        ...entity,
        createdAt: new Date(),
        id: rowId,
      })),
    };

    const app = await Test.createTestingModule({
      providers: [
        AgentCliPreferencesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(UserDisabledAgentCli),
          useValue: disabledRepository,
        },
      ],
    }).compile();

    service = app.get(AgentCliPreferencesService);
  });

  describe('getDisabledBackends', () => {
    it('returns an empty set when the user has disabled nothing', async () => {
      disabledRepository.find.mockResolvedValue([]);
      await expect(service.getDisabledBackends(userId)).resolves.toEqual(
        new Set(),
      );
    });

    it('returns the set of disabled backends', async () => {
      disabledRepository.find.mockResolvedValue([
        { backend: 'claude', userId },
        { backend: 'grok', userId },
      ]);
      const disabled = await service.getDisabledBackends(userId);
      expect(disabled).toEqual(new Set(['claude', 'grok']));
    });
  });

  describe('isEnabled', () => {
    it('is enabled when no disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await expect(service.isEnabled(userId, 'claude')).resolves.toBe(true);
    });

    it('is disabled when a disable row exists', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        userId,
      });
      await expect(service.isEnabled(userId, 'claude')).resolves.toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('deletes the disable row when enabling', async () => {
      await service.setEnabled(userId, 'claude', true);
      expect(disabledRepository.delete).toHaveBeenCalledWith({
        backend: 'claude',
        userId,
      });
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });

    it('inserts a disable row when disabling a currently-enabled backend', async () => {
      disabledRepository.findOne.mockResolvedValue(null);
      await service.setEnabled(userId, 'claude', false);
      expect(disabledRepository.save).toHaveBeenCalledOnce();
      expect(disabledRepository.create).toHaveBeenCalledWith({
        backend: 'claude',
        userId,
      });
    });

    it('is idempotent when disabling an already-disabled backend', async () => {
      disabledRepository.findOne.mockResolvedValue({
        backend: 'claude',
        userId,
      });
      await service.setEnabled(userId, 'claude', false);
      expect(disabledRepository.save).not.toHaveBeenCalled();
    });
  });
});
