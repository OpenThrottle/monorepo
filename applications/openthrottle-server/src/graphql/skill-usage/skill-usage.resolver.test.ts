import {
  RolesService,
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEventsService,
  type SkillUsageEvent,
} from '@openthrottle/nestjs-repositories';
import { BadRequestException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { SkillUsageResolver } from './skill-usage.resolver';

describe('SkillUsageResolver', () => {
  let resolver: SkillUsageResolver;
  const recordSkillUsage = vi.fn();
  const getUsageAggregation = vi.fn();

  const mockService = createMock<SkillUsageEventsService>({
    getUsageAggregation,
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
        { provide: RolesService, useValue: createMock<RolesService>() },
        GqlPermissionsGuard,
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

  describe('skillUsage', () => {
    test('returns mapped aggregation for a valid date window', async () => {
      getUsageAggregation.mockResolvedValue({
        byDay: [
          {
            date: '2026-07-15',
            oursCount: 2,
            thirdPartyCount: 1,
            totalCount: 3,
          },
        ],
        byScope: [
          { count: 2, scope: SKILL_USAGE_SCOPES.OURS },
          { count: 1, scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
        ],
        bySkill: [
          { count: 2, scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' },
        ],
        filterOptions: { cwds: ['/repo'], gitBranches: ['main'] },
        totalCount: 3,
      });

      const result = await resolver.skillUsage(
        '2026-07-01',
        '2026-07-31',
        null,
        null,
        null,
      );

      expect(getUsageAggregation).toHaveBeenCalledWith({
        cwd: null,
        end: '2026-07-31',
        gitBranch: null,
        scope: null,
        start: '2026-07-01',
      });
      expect(result.totalCount).toBe(3);
      expect(result.bySkill[0]?.skillName).toBe('ot-plans');
      expect(result.byScope).toHaveLength(2);
      expect(result.byDay[0]?.date).toBe('2026-07-15');
      expect(result.filterOptions.gitBranches).toEqual(['main']);
    });

    describe('when scope/gitBranch/cwd are provided', () => {
      test('forwards filters to the service', async () => {
        getUsageAggregation.mockResolvedValue({
          byDay: [],
          byScope: [],
          bySkill: [],
          filterOptions: { cwds: [], gitBranches: [] },
          totalCount: 0,
        });

        await resolver.skillUsage(
          '2026-07-01',
          '2026-07-31',
          SKILL_USAGE_SCOPES.OURS,
          'example-usage-tracking',
          '/repo',
        );

        expect(getUsageAggregation).toHaveBeenCalledWith({
          cwd: '/repo',
          end: '2026-07-31',
          gitBranch: 'example-usage-tracking',
          scope: SKILL_USAGE_SCOPES.OURS,
          start: '2026-07-01',
        });
      });
    });

    describe('when start is not YYYY-MM-DD', () => {
      test('rejects with BadRequestException', async () => {
        await expect(
          resolver.skillUsage('july', '2026-07-31', null, null, null),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    describe('when scope is invalid', () => {
      test('rejects with BadRequestException', async () => {
        await expect(
          resolver.skillUsage(
            '2026-07-01',
            '2026-07-31',
            'unknown',
            null,
            null,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });
  });
});
