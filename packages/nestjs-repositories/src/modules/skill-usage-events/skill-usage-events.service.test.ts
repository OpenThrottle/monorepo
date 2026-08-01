import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEvent,
} from './skill-usage-events.entity';
import { SkillUsageEventsService } from './skill-usage-events.service';
import {
  SKILL_USAGE_OUTCOMES,
  SkillUsageOutcome,
} from './skill-usage-outcomes.entity';

type QueryBuilderMock = {
  addGroupBy: ReturnType<typeof vi.fn>;
  addOrderBy: ReturnType<typeof vi.fn>;
  addSelect: ReturnType<typeof vi.fn>;
  andWhere: ReturnType<typeof vi.fn>;
  getRawMany: ReturnType<typeof vi.fn>;
  getRawOne: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
};

const createQueryBuilderMock = (
  overrides: Partial<QueryBuilderMock> = {},
): QueryBuilderMock => {
  const qb: QueryBuilderMock = {
    addGroupBy: vi.fn(),
    addOrderBy: vi.fn(),
    addSelect: vi.fn(),
    andWhere: vi.fn(),
    getRawMany: vi.fn().mockResolvedValue([]),
    getRawOne: vi.fn().mockResolvedValue({ count: 0 }),
    groupBy: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
    ...overrides,
  };

  // Chainable — every builder method returns the same qb.
  const chainKeys: ReadonlyArray<keyof QueryBuilderMock> = [
    'addGroupBy',
    'addOrderBy',
    'addSelect',
    'andWhere',
    'groupBy',
    'limit',
    'orderBy',
    'select',
    'where',
  ];
  for (const key of chainKeys) {
    qb[key].mockReturnValue(qb);
  }

  return qb;
};

describe('SkillUsageEventsService', () => {
  const buildService = async (mockRepos: {
    events?: {
      create?: ReturnType<typeof vi.fn>;
      createQueryBuilder?: ReturnType<typeof vi.fn>;
      save?: ReturnType<typeof vi.fn>;
    };
    outcomes?: {
      create?: ReturnType<typeof vi.fn>;
      createQueryBuilder?: ReturnType<typeof vi.fn>;
      save?: ReturnType<typeof vi.fn>;
    };
  }): Promise<SkillUsageEventsService> => {
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageEventsService,
        {
          provide: getRepositoryToken(SkillUsageEvent),
          useValue: {
            create: vi.fn(),
            createQueryBuilder: vi
              .fn()
              .mockReturnValue(createQueryBuilderMock()),
            save: vi.fn(),
            ...mockRepos.events,
          },
        },
        {
          provide: getRepositoryToken(SkillUsageOutcome),
          useValue: {
            create: vi.fn(),
            createQueryBuilder: vi
              .fn()
              .mockReturnValue(createQueryBuilderMock()),
            save: vi.fn(),
            ...mockRepos.outcomes,
          },
        },
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
      const service = await buildService({ events: { create, save } });
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
        source: 'claude-code',
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
        source: 'claude-code',
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
        const service = await buildService({ events: { create, save } });
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
          source: null,
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
        const service = await buildService({ events: { create, save } });
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

  describe('recordSkillUsageOutcome', () => {
    it('maps outcome + duration and defaults scope to ours', async () => {
      const create = vi.fn((input: Partial<SkillUsageOutcome>) => input);
      const save = vi.fn((row: Partial<SkillUsageOutcome>) =>
        Promise.resolve({ ...row, id: 'outcome-1', receivedAt: new Date() }),
      );
      const service = await buildService({ outcomes: { create, save } });
      const occurredAt = new Date('2026-07-31T12:05:00.000Z');

      const saved = await service.recordSkillUsageOutcome({
        cwd: '/repo',
        durationMs: 4200,
        gitBranch: 'example-usage-tracking',
        occurredAt,
        outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        toolUseId: 'tool-1',
      });

      expect(create).toHaveBeenCalledWith({
        cwd: '/repo',
        durationMs: 4200,
        gitBranch: 'example-usage-tracking',
        occurredAt,
        outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        toolUseId: 'tool-1',
      });
      expect(saved.id).toBe('outcome-1');
    });

    describe('when durationMs and sessionId are omitted', () => {
      it('nulls optional correlation/duration fields', async () => {
        const create = vi.fn((input: Partial<SkillUsageOutcome>) => input);
        const save = vi.fn((row: Partial<SkillUsageOutcome>) =>
          Promise.resolve({ ...row, id: 'outcome-2', receivedAt: new Date() }),
        );
        const service = await buildService({ outcomes: { create, save } });
        const occurredAt = new Date('2026-07-31T12:06:00.000Z');

        await service.recordSkillUsageOutcome({
          occurredAt,
          outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
          skillName: 'ot-plans',
        });

        expect(create).toHaveBeenCalledWith({
          cwd: null,
          durationMs: null,
          gitBranch: null,
          occurredAt,
          outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
          scope: SKILL_USAGE_SCOPES.OURS,
          sessionId: null,
          skillName: 'ot-plans',
          toolUseId: null,
        });
      });
    });
  });

  describe('listBySkill', () => {
    it('groups starts by skill_name + scope and merges outcome stats', async () => {
      const eventsQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            count: '12',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
          {
            count: '3',
            scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
            skillName: 'vercel:deploy',
          },
        ]),
      });
      const outcomesQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            abandonedCount: '1',
            avgDurationMs: '1500.4',
            errorCount: '0',
            outcomeCount: '8',
            skillName: 'ot-plans',
            successCount: '7',
          },
        ]),
      });
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await service.listBySkill({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(eventsQb.groupBy).toHaveBeenCalledWith('e.skill_name');
      expect(eventsQb.limit).toHaveBeenCalledWith(50);
      expect(rows).toEqual([
        {
          abandonedCount: 1,
          avgDurationMs: 1500,
          count: 12,
          errorCount: 0,
          outcomeCount: 8,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
          successCount: 7,
        },
        {
          abandonedCount: 0,
          avgDurationMs: null,
          count: 3,
          errorCount: 0,
          outcomeCount: 0,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
          successCount: 0,
        },
      ]);
    });

    describe('when gitBranch and cwd filters are set', () => {
      it('adds equality predicates on both start and outcome queries', async () => {
        const eventsQb = createQueryBuilderMock();
        const outcomesQb = createQueryBuilderMock();
        const service = await buildService({
          events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
          outcomes: {
            createQueryBuilder: vi.fn().mockReturnValue(outcomesQb),
          },
        });

        await service.listBySkill({
          cwd: '/repo',
          end: '2026-07-31',
          gitBranch: 'main',
          start: '2026-07-01',
        });

        expect(eventsQb.andWhere).toHaveBeenCalledWith(
          'e.git_branch = :gitBranch',
          { gitBranch: 'main' },
        );
        expect(eventsQb.andWhere).toHaveBeenCalledWith('e.cwd = :cwd', {
          cwd: '/repo',
        });
        expect(outcomesQb.andWhere).toHaveBeenCalledWith(
          'o.git_branch = :gitBranch',
          { gitBranch: 'main' },
        );
        expect(outcomesQb.andWhere).toHaveBeenCalledWith('o.cwd = :cwd', {
          cwd: '/repo',
        });
      });
    });
  });

  describe('listByScope', () => {
    it('returns ours vs third-party counts', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          { count: '10', scope: SKILL_USAGE_SCOPES.OURS },
          { count: '4', scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
        ]),
      });
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await service.listByScope({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows).toEqual([
        { count: 10, scope: SKILL_USAGE_SCOPES.OURS },
        { count: 4, scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
      ]);
    });
  });

  describe('listByDay', () => {
    it('maps per-day ours/third-party/total counts', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            date: '2026-07-15',
            oursCount: '2',
            thirdPartyCount: '1',
            totalCount: '3',
          },
        ]),
      });
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await service.listByDay({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows).toEqual([
        {
          date: '2026-07-15',
          oursCount: 2,
          thirdPartyCount: 1,
          totalCount: 3,
        },
      ]);
    });
  });

  describe('getUsageAggregation', () => {
    it('composes bySkill/byScope/byDay/totalCount/filterOptions', async () => {
      const skillQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            count: '5',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ]),
      });
      const outcomeQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([]),
      });
      const scopeQb = createQueryBuilderMock({
        getRawMany: vi
          .fn()
          .mockResolvedValue([{ count: '5', scope: SKILL_USAGE_SCOPES.OURS }]),
      });
      const dayQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            date: '2026-07-15',
            oursCount: '5',
            thirdPartyCount: '0',
            totalCount: '5',
          },
        ]),
      });
      const countQb = createQueryBuilderMock({
        getRawOne: vi.fn().mockResolvedValue({ count: '5' }),
      });
      const branchQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([{ value: 'main' }]),
      });
      const cwdQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([{ value: '/repo' }]),
      });

      const eventsCreateQueryBuilder = vi
        .fn()
        .mockReturnValueOnce(skillQb)
        .mockReturnValueOnce(scopeQb)
        .mockReturnValueOnce(dayQb)
        .mockReturnValueOnce(countQb)
        .mockReturnValueOnce(branchQb)
        .mockReturnValueOnce(cwdQb);

      const service = await buildService({
        events: { createQueryBuilder: eventsCreateQueryBuilder },
        outcomes: {
          createQueryBuilder: vi.fn().mockReturnValue(outcomeQb),
        },
      });
      const result = await service.getUsageAggregation({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(result.totalCount).toBe(5);
      expect(result.bySkill).toEqual([
        {
          abandonedCount: 0,
          avgDurationMs: null,
          count: 5,
          errorCount: 0,
          outcomeCount: 0,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
          successCount: 0,
        },
      ]);
      expect(result.byScope).toEqual([
        { count: 5, scope: SKILL_USAGE_SCOPES.OURS },
      ]);
      expect(result.filterOptions).toEqual({
        cwds: ['/repo'],
        gitBranches: ['main'],
      });
    });
  });
});
