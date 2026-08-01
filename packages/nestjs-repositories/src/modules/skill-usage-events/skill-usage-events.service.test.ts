import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEvent,
} from './skill-usage-events.entity';
import { SkillUsageEventsService } from './skill-usage-events.service';

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
  const buildService = async (mockRepo: {
    create?: ReturnType<typeof vi.fn>;
    createQueryBuilder?: ReturnType<typeof vi.fn>;
    save?: ReturnType<typeof vi.fn>;
  }): Promise<SkillUsageEventsService> => {
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageEventsService,
        {
          provide: getRepositoryToken(SkillUsageEvent),
          useValue: {
            create: vi.fn(),
            createQueryBuilder: vi.fn(),
            save: vi.fn(),
            ...mockRepo,
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

  describe('listBySkill', () => {
    it('groups by skill_name + scope, orders by count desc, and maps rows', async () => {
      const qb = createQueryBuilderMock({
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
      const createQueryBuilder = vi.fn().mockReturnValue(qb);
      const service = await buildService({ createQueryBuilder });

      const rows = await service.listBySkill({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(createQueryBuilder).toHaveBeenCalledWith('e');
      expect(qb.where).toHaveBeenCalledWith('e.occurred_at >= :start', {
        start: '2026-07-01',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'e.occurred_at < :endExclusive',
        { endExclusive: '2026-08-01T00:00:00.000Z' },
      );
      expect(qb.groupBy).toHaveBeenCalledWith('e.skill_name');
      expect(qb.limit).toHaveBeenCalledWith(50);
      expect(rows).toEqual([
        { count: 12, scope: SKILL_USAGE_SCOPES.OURS, skillName: 'ot-plans' },
        {
          count: 3,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          skillName: 'vercel:deploy',
        },
      ]);
    });

    describe('when gitBranch and cwd filters are set', () => {
      it('adds equality predicates for both', async () => {
        const qb = createQueryBuilderMock();
        const service = await buildService({
          createQueryBuilder: vi.fn().mockReturnValue(qb),
        });

        await service.listBySkill({
          cwd: '/repo',
          end: '2026-07-31',
          gitBranch: 'main',
          start: '2026-07-01',
        });

        expect(qb.andWhere).toHaveBeenCalledWith('e.git_branch = :gitBranch', {
          gitBranch: 'main',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('e.cwd = :cwd', {
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
        createQueryBuilder: vi.fn().mockReturnValue(qb),
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
        createQueryBuilder: vi.fn().mockReturnValue(qb),
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

      const createQueryBuilder = vi
        .fn()
        .mockReturnValueOnce(skillQb)
        .mockReturnValueOnce(scopeQb)
        .mockReturnValueOnce(dayQb)
        .mockReturnValueOnce(countQb)
        .mockReturnValueOnce(branchQb)
        .mockReturnValueOnce(cwdQb);

      const service = await buildService({ createQueryBuilder });
      const result = await service.getUsageAggregation({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(result.totalCount).toBe(5);
      expect(result.bySkill).toHaveLength(1);
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
