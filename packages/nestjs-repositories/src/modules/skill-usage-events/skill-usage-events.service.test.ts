import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEvent,
} from './skill-usage-events.entity';
import { SkillUsageEventsService } from './skill-usage-events.service';

describe('SkillUsageEventsService', () => {
  const buildService = async (mockRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  }): Promise<SkillUsageEventsService> => {
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageEventsService,
        { provide: getRepositoryToken(SkillUsageEvent), useValue: mockRepo },
      ],
    }).compile();

    return app.get<SkillUsageEventsService>(SkillUsageEventsService);
  };

  describe('recordSkillUsage', () => {
    it('maps a full input to a row and defaults privacy_level to truncated', async () => {
      const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
      const save = vi.fn((row: Partial<SkillUsageEvent>) =>
        Promise.resolve({ ...row, id: 'event-1', receivedAt: new Date() }),
      );
      const service = await buildService({ create, save });
      const occurredAt = new Date('2026-07-31T12:00:00.000Z');

      const saved = await service.recordSkillUsage({
        agentId: 'agent-1',
        agentType: 'general-purpose',
        args: 'do the thing…',
        cwd: '/repo',
        gitBranch: 'example-usage-tracking',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt,
        promptId: 'prompt-1',
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        toolUseId: 'tool-1',
      });

      expect(create).toHaveBeenCalledWith({
        agentId: 'agent-1',
        agentType: 'general-purpose',
        args: 'do the thing…',
        cwd: '/repo',
        gitBranch: 'example-usage-tracking',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt,
        privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
        promptId: 'prompt-1',
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        toolUseId: 'tool-1',
      });
      expect(saved.id).toBe('event-1');
    });

    describe('when optional fields are omitted', () => {
      it('nulls optional columns and keeps required skillName/scope/occurredAt', async () => {
        const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
        const save = vi.fn((row: Partial<SkillUsageEvent>) =>
          Promise.resolve({ ...row, id: 'event-2', receivedAt: new Date() }),
        );
        const service = await buildService({ create, save });
        const occurredAt = new Date('2026-07-31T13:00:00.000Z');

        await service.recordSkillUsage({
          occurredAt,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        });

        expect(create).toHaveBeenCalledWith({
          agentId: null,
          agentType: null,
          args: null,
          cwd: null,
          gitBranch: null,
          hookEventName: null,
          invocationPath: null,
          occurredAt,
          privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
          promptId: null,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          sessionId: null,
          skillName: 'vercel:deploy',
          toolUseId: null,
        });
      });
    });

    describe('when privacyLevel is name-only', () => {
      it('stores the client-provided level without altering args', async () => {
        const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
        const save = vi.fn((row: Partial<SkillUsageEvent>) =>
          Promise.resolve({ ...row, id: 'event-3', receivedAt: new Date() }),
        );
        const service = await buildService({ create, save });
        const occurredAt = new Date('2026-07-31T14:00:00.000Z');

        await service.recordSkillUsage({
          args: null,
          occurredAt,
          privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'git-commit',
        });

        expect(create).toHaveBeenCalledWith(
          expect.objectContaining({
            args: null,
            privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY,
            skillName: 'git-commit',
          }),
        );
      });
    });
  });
});
