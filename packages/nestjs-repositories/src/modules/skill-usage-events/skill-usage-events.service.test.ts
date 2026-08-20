import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEvent,
} from './skill-usage-events.entity';
import {
  SKILL_USAGE_DEFAULT_BRANCHES,
  SkillUsageEventsService,
} from './skill-usage-events.service';
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
  setParameters: ReturnType<typeof vi.fn>;
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
    setParameters: vi.fn(),
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
    'setParameters',
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
            lastUsedAt: '2026-07-30T09:00:00.000Z',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
          {
            count: '3',
            lastUsedAt: '2026-07-28T09:00:00.000Z',
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
          lastUsedAt: new Date('2026-07-30T09:00:00.000Z'),
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
          lastUsedAt: new Date('2026-07-28T09:00:00.000Z'),
          outcomeCount: 0,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
          successCount: 0,
        },
      ]);
    });

    it('merges a mixed automatic + opt-in feed and averages only non-null durations', async () => {
      // One skill, one aggregated outcome row that blends the automatic feed
      // (success + abandoned, abandoned having null duration) with an opt-in
      // `error`. Postgres AVG(duration_ms) ignores the null-duration abandoned
      // row, so avgDurationMs reflects only the timed outcomes.
      const eventsQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            count: '20',
            lastUsedAt: '2026-07-31T00:00:00.000Z',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ]),
      });
      const outcomesQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            abandonedCount: '3',
            avgDurationMs: '2000', // AVG over the 6 success + 1 error timed rows
            errorCount: '1',
            outcomeCount: '10',
            skillName: 'ot-plans',
            successCount: '6',
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

      // The outcome aggregation asks Postgres for a null-excluding average.
      expect(outcomesQb.addSelect).toHaveBeenCalledWith(
        'AVG(o.duration_ms)',
        'avgDurationMs',
      );
      expect(rows).toEqual([
        {
          abandonedCount: 3,
          avgDurationMs: 2000,
          count: 20,
          errorCount: 1,
          lastUsedAt: new Date('2026-07-31T00:00:00.000Z'),
          outcomeCount: 10,
          scope: SKILL_USAGE_SCOPES.OURS,
          skillName: 'ot-plans',
          successCount: 6,
        },
      ]);
    });

    describe('when the scope filter is set', () => {
      it('applies o.scope on the outcome query so the new feed is filtered', async () => {
        const eventsQb = createQueryBuilderMock();
        const outcomesQb = createQueryBuilderMock();
        const service = await buildService({
          events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
          outcomes: {
            createQueryBuilder: vi.fn().mockReturnValue(outcomesQb),
          },
        });

        await service.listBySkill({
          end: '2026-07-31',
          scope: SKILL_USAGE_SCOPES.OURS,
          start: '2026-07-01',
        });

        expect(outcomesQb.andWhere).toHaveBeenCalledWith('o.scope = :scope', {
          scope: SKILL_USAGE_SCOPES.OURS,
        });
      });
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

  describe('when a skillName filter is set', () => {
    it('applies e.skill_name to starts and o.skill_name to outcomes', async () => {
      const eventsQb = createQueryBuilderMock();
      const outcomesQb = createQueryBuilderMock();
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await service.listBySkill({
        end: '2026-07-31',
        skillName: 'ot-plans',
        start: '2026-07-01',
      });

      expect(eventsQb.andWhere).toHaveBeenCalledWith(
        'e.skill_name = :skillName',
        { skillName: 'ot-plans' },
      );
      expect(outcomesQb.andWhere).toHaveBeenCalledWith(
        'o.skill_name = :skillName',
        { skillName: 'ot-plans' },
      );
    });

    it('computes lastUsedAt from the filtered window as a Date', async () => {
      const eventsQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([
          {
            count: '4',
            lastUsedAt: '2026-07-29T18:30:00.000Z',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ]),
      });
      const outcomesQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([]),
      });
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await service.listBySkill({
        end: '2026-07-31',
        skillName: 'ot-plans',
        start: '2026-07-01',
      });

      expect(eventsQb.addSelect).toHaveBeenCalledWith(
        'MAX(e.occurred_at)',
        'lastUsedAt',
      );
      expect(rows[0]?.lastUsedAt).toEqual(new Date('2026-07-29T18:30:00.000Z'));
    });

    it('returns empty aggregates (no error) for an unknown skillName', async () => {
      // Every builder resolves to no rows: an unknown skill filters everything out.
      const service = await buildService({});

      const result = await service.getUsageAggregation({
        end: '2026-07-31',
        skillName: 'does-not-exist',
        start: '2026-07-01',
      });

      expect(result.bySkill).toEqual([]);
      expect(result.byScope).toEqual([]);
      expect(result.byDay).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.filterOptions).toEqual({ cwds: [], gitBranches: [] });
    });
  });

  describe('when skillName is omitted', () => {
    it('adds no skill_name predicate on the start query', async () => {
      const eventsQb = createQueryBuilderMock();
      const outcomesQb = createQueryBuilderMock();
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await service.listBySkill({ end: '2026-07-31', start: '2026-07-01' });

      const skillNamePredicate = eventsQb.andWhere.mock.calls.find(
        (call) => call[0] === 'e.skill_name = :skillName',
      );
      expect(skillNamePredicate).toBeUndefined();
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
          lastUsedAt: null,
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
  describe('listFilterOptions', () => {
    it('caps both option lists so the deprecated field stays bounded', async () => {
      const branchQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([{ value: 'main' }]),
      });
      const cwdQb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue([{ value: '/repo' }]),
      });
      const service = await buildService({
        events: {
          createQueryBuilder: vi
            .fn()
            .mockReturnValueOnce(branchQb)
            .mockReturnValueOnce(cwdQb),
        },
      });

      await service.listFilterOptions({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(branchQb.limit).toHaveBeenCalledWith(50);
      expect(cwdQb.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('searchGitBranches', () => {
    const buildBranchService = async (
      rows: ReadonlyArray<Record<string, unknown>>,
    ): Promise<{
      qb: QueryBuilderMock;
      service: SkillUsageEventsService;
    }> => {
      const qb = createQueryBuilderMock({
        getRawMany: vi.fn().mockResolvedValue(rows),
      });
      const service = await buildService({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      return { qb, service };
    };

    it('ranks the default branches in SQL and maps counts to numbers', async () => {
      const { qb, service } = await buildBranchService([
        { branch: 'main', count: '12' },
        { branch: 'alpha', count: '3' },
      ]);

      const result = await service.searchGitBranches({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(qb.orderBy).toHaveBeenCalledWith(
        'CASE e.git_branch WHEN :primaryBranch THEN 0 WHEN :secondaryBranch THEN 1 ELSE 2 END',
        'ASC',
      );
      expect(qb.addOrderBy).toHaveBeenCalledWith('e.git_branch', 'ASC');
      expect(qb.setParameters).toHaveBeenCalledWith({
        primaryBranch: 'main',
        secondaryBranch: 'master',
      });
      expect(qb.groupBy).toHaveBeenCalledWith('e.git_branch');
      expect(result).toEqual({
        hasMore: false,
        items: [
          { branch: 'main', count: 12 },
          { branch: 'alpha', count: 3 },
        ],
      });
    });

    it('pins main ahead of master when both rank', () => {
      expect(SKILL_USAGE_DEFAULT_BRANCHES).toEqual(['main', 'master']);
    });

    describe('when a master-only window is returned', () => {
      it('keeps the SQL rank so master leads the alphabetical tail', async () => {
        const { service } = await buildBranchService([
          { branch: 'master', count: '9' },
          { branch: 'alpha', count: '1' },
        ]);

        const result = await service.searchGitBranches({
          end: '2026-07-31',
          start: '2026-07-01',
        });

        expect(result.items.map((row) => row.branch)).toEqual([
          'master',
          'alpha',
        ]);
      });
    });

    describe('when a query is supplied', () => {
      it('adds a parameterized ILIKE substring predicate on the trimmed value', async () => {
        const { qb, service } = await buildBranchService([]);

        await service.searchGitBranches({
          end: '2026-07-31',
          query: '  Feat  ',
          start: '2026-07-01',
        });

        expect(qb.andWhere).toHaveBeenCalledWith(
          'e.git_branch ILIKE :branchPattern',
          { branchPattern: '%Feat%' },
        );
      });

      it('escapes LIKE metacharacters instead of honoring them', async () => {
        const { qb, service } = await buildBranchService([]);

        await service.searchGitBranches({
          end: '2026-07-31',
          query: '100%_x',
          start: '2026-07-01',
        });

        expect(qb.andWhere).toHaveBeenCalledWith(
          'e.git_branch ILIKE :branchPattern',
          { branchPattern: '%100\\%\\_x%' },
        );
      });
    });

    describe('when the query is blank', () => {
      it('adds no ILIKE predicate', async () => {
        const { qb, service } = await buildBranchService([]);

        await service.searchGitBranches({
          end: '2026-07-31',
          query: '   ',
          start: '2026-07-01',
        });

        expect(qb.andWhere).not.toHaveBeenCalledWith(
          'e.git_branch ILIKE :branchPattern',
          expect.anything(),
        );
      });
    });

    describe('when limit is omitted, oversized, or nonsense', () => {
      /** Resolve the LIMIT the builder was handed for one requested limit. */
      const limitFor = async (limit?: number | null): Promise<unknown> => {
        const { qb, service } = await buildBranchService([]);

        await service.searchGitBranches({
          end: '2026-07-31',
          limit,
          start: '2026-07-01',
        });

        const [firstCall] = qb.limit.mock.calls;

        return firstCall?.[0];
      };

      it('defaults to 20 and clamps to [1, 50], fetching one extra row', async () => {
        const [omitted, oversized, zero, notFinite] = await Promise.all([
          limitFor(null),
          limitFor(500),
          limitFor(0),
          limitFor(Number.NaN),
        ]);

        expect(omitted).toBe(21);
        expect(oversized).toBe(51);
        expect(zero).toBe(2);
        expect(notFinite).toBe(21);
      });
    });

    describe('when more rows exist than the limit', () => {
      it('flips hasMore and slices the extra row off', async () => {
        const { service } = await buildBranchService([
          { branch: 'main', count: '3' },
          { branch: 'alpha', count: '2' },
          { branch: 'beta', count: '1' },
        ]);

        const result = await service.searchGitBranches({
          end: '2026-07-31',
          limit: 2,
          start: '2026-07-01',
        });

        expect(result.hasMore).toBe(true);
        expect(result.items.map((row) => row.branch)).toEqual([
          'main',
          'alpha',
        ]);
      });
    });

    describe('when a skillName is supplied', () => {
      it('narrows the window to that skill', async () => {
        const { qb, service } = await buildBranchService([]);

        await service.searchGitBranches({
          end: '2026-07-31',
          skillName: 'ot-plans',
          start: '2026-07-01',
        });

        expect(qb.andWhere).toHaveBeenCalledWith('e.skill_name = :skillName', {
          skillName: 'ot-plans',
        });
      });
    });

    describe('when the window has no branches', () => {
      it('returns an empty, non-paged result', async () => {
        const { service } = await buildBranchService([]);

        await expect(
          service.searchGitBranches({ end: '2026-07-31', start: '2026-07-01' }),
        ).resolves.toEqual({ hasMore: false, items: [] });
      });
    });
  });
});
