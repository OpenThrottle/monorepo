import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEventsService,
  type SkillUsageEvent,
} from '@openthrottle/nestjs-repositories';
import { BadRequestException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { SkillUsageResolver } from './skill-usage.resolver';

describe('SkillUsageResolver', () => {
  let resolver: SkillUsageResolver;
  const recordSkillUsage = vi.fn();

  const mockService = createMock<SkillUsageEventsService>({
    recordSkillUsage,
  });

  const savedRow: SkillUsageEvent = {
    agentId: null,
    agentType: null,
    args: 'truncated args…',
    cwd: '/repo',
    gitBranch: 'example-usage-tracking',
    hookEventName: 'PreToolUse',
    id: 'event-1',
    invocationPath: 'skill_tool',
    occurredAt: new Date('2026-07-31T12:00:00.000Z'),
    privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
    promptId: null,
    receivedAt: new Date('2026-07-31T12:00:01.000Z'),
    scope: SKILL_USAGE_SCOPES.OURS,
    sessionId: 'session-1',
    skillName: 'ot-plans',
    toolUseId: null,
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageResolver,
        { provide: SkillUsageEventsService, useValue: mockService },
      ],
    }).compile();

    resolver = app.get<SkillUsageResolver>(SkillUsageResolver);
  });

  describe('recordSkillUsage', () => {
    test('persists a valid event and returns the mapped object', async () => {
      recordSkillUsage.mockResolvedValue(savedRow);

      const result = await resolver.recordSkillUsage({
        args: 'truncated args…',
        cwd: '/repo',
        gitBranch: 'example-usage-tracking',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt: new Date('2026-07-31T12:00:00.000Z'),
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
      });

      expect(recordSkillUsage).toHaveBeenCalledWith({
        agentId: null,
        agentType: null,
        args: 'truncated args…',
        cwd: '/repo',
        gitBranch: 'example-usage-tracking',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt: new Date('2026-07-31T12:00:00.000Z'),
        privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
        promptId: null,
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        toolUseId: null,
      });
      expect(result.id).toBe('event-1');
      expect(result.skillName).toBe('ot-plans');
      expect(result.scope).toBe(SKILL_USAGE_SCOPES.OURS);
      expect(result.args).toBe('truncated args…');
    });

    describe('when skillName is blank', () => {
      test('rejects with BadRequestException', async () => {
        await expect(
          resolver.recordSkillUsage({
            occurredAt: new Date(),
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: '   ',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('when scope is invalid', () => {
      test('rejects with BadRequestException', async () => {
        await expect(
          resolver.recordSkillUsage({
            occurredAt: new Date(),
            scope: 'unknown',
            skillName: 'ot-plans',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('when privacyLevel is invalid', () => {
      test('rejects with BadRequestException', async () => {
        await expect(
          resolver.recordSkillUsage({
            occurredAt: new Date(),
            privacyLevel: 'verbose',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('when privacyLevel is name-only', () => {
      test('forwards the level and null args without re-expanding', async () => {
        recordSkillUsage.mockResolvedValue({
          ...savedRow,
          args: null,
          privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY,
        });

        await resolver.recordSkillUsage({
          args: null,
          occurredAt: new Date('2026-07-31T12:00:00.000Z'),
          privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        });

        expect(recordSkillUsage).toHaveBeenCalledWith(
          expect.objectContaining({
            args: null,
            privacyLevel: SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY,
            scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
            skillName: 'vercel:deploy',
          }),
        );
      });
    });
  });
});
