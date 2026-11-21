import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { QueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import { describe, expect, it, vi } from 'vitest';

import { SkillUsageEvent } from './skill-usage-event.entity.ts';
import {
  SKILL_USAGE_DEFAULT_BRANCHES,
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
} from './skill-usage-events.constants.ts';
import { SkillUsageEventsRepository } from './skill-usage-events.repository.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

/** INSERT … ON CONFLICT DO NOTHING RETURNING id; `raw` is what Postgres returns. */
const insertBuilderMock = (raw: unknown[]) => {
  const execute = vi.fn().mockResolvedValue({ raw });
  const builder = {
    execute,
    insert: vi.fn(),
    into: vi.fn(),
    orIgnore: vi.fn(),
    returning: vi.fn(),
    values: vi.fn(),
  };
  builder.insert.mockReturnValue(builder);
  builder.into.mockReturnValue(builder);
  builder.orIgnore.mockReturnValue(builder);
  builder.returning.mockReturnValue(builder);
  builder.values.mockReturnValue(builder);

  return builder;
};

describe('SkillUsageEventsRepository', () => {
  const buildRepository = async (mockRepos: {
    events?: {
      create?: ReturnType<typeof vi.fn>;
      createQueryBuilder?: ReturnType<typeof vi.fn>;
      findOneByOrFail?: ReturnType<typeof vi.fn>;
      findOneOrFail?: ReturnType<typeof vi.fn>;
      save?: ReturnType<typeof vi.fn>;
    };
    outcomes?: {
      createQueryBuilder?: ReturnType<typeof vi.fn>;
    };
  }): Promise<SkillUsageEventsRepository> => {
    // The outcomes table is reached through the events repository's entity
    // manager, so the outcomes mock hangs off `manager.getRepository`.
    const outcomesRepository = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValue(createQueryBuilderMock<SkillUsageEvent>()),
      ...mockRepos.outcomes,
    };
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageEventsRepository,
        {
          provide: getRepositoryToken(SkillUsageEvent),
          useValue: {
            create: vi.fn(),
            createQueryBuilder: vi
              .fn()
              .mockReturnValue(createQueryBuilderMock<SkillUsageEvent>()),
            manager: { getRepository: vi.fn(() => outcomesRepository) },
            save: vi.fn(),
            target: SkillUsageEvent,
            ...mockRepos.events,
          },
        },
      ],
    }).compile();

    return app.get<SkillUsageEventsRepository>(SkillUsageEventsRepository);
  };

  describe('recordSkillUsage', () => {
    it('maps a full input to a row and defaults privacy_level to truncated', async () => {
      const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
      const createQueryBuilder = vi
        .fn()
        .mockReturnValue(insertBuilderMock([{ id: 'event-1' }]));
      const findOneByOrFail = vi.fn(({ id }: { id: string }) =>
        Promise.resolve({ id, receivedAt: new Date(FIXED_NOW) }),
      );
      const repository = await buildRepository({
        events: { create, createQueryBuilder, findOneByOrFail },
      });
      const occurredAt = new Date('2026-07-31T12:00:00.000Z');

      const saved = await repository.recordSkillUsage({
        agentId: 'agent-1',
        agentType: 'general-purpose',
        args: 'do the thing…',
        cwd: '/repo',
        gitBranch: 'example-usage-tracking',
        hookEventName: 'PreToolUse',
        invocationPath: 'skill_tool',
        occurredAt,
        promptId: 'prompt-1',
        repoIdentity: 'https://github.com/org/repo',
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        source: 'claude-code',
        toolUseId: 'tool-1',
        userId: 'user-1',
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
        repoIdentity: 'https://github.com/org/repo',
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        source: 'claude-code',
        toolUseId: 'tool-1',
        userId: 'user-1',
      });
      expect(saved.id).toBe('event-1');
    });

    describe('when optional fields are omitted', () => {
      it('nulls optional columns and keeps required skillName/scope/occurredAt', async () => {
        const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
        const createQueryBuilder = vi
          .fn()
          .mockReturnValue(insertBuilderMock([{ id: 'event-2' }]));
        const findOneByOrFail = vi.fn(({ id }: { id: string }) =>
          Promise.resolve({ id, receivedAt: new Date(FIXED_NOW) }),
        );
        const repository = await buildRepository({
          events: { create, createQueryBuilder, findOneByOrFail },
        });
        const occurredAt = new Date('2026-07-31T13:00:00.000Z');

        await repository.recordSkillUsage({
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
          repoIdentity: null,
          scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
          sessionId: null,
          skillName: 'vercel:deploy',
          source: null,
          toolUseId: null,
          userId: null,
        });
      });
    });

    describe('when privacyLevel is name-only', () => {
      it('stores the client-provided level without altering args', async () => {
        const create = vi.fn((input: Partial<SkillUsageEvent>) => input);
        const createQueryBuilder = vi
          .fn()
          .mockReturnValue(insertBuilderMock([{ id: 'event-3' }]));
        const findOneByOrFail = vi.fn(({ id }: { id: string }) =>
          Promise.resolve({ id, receivedAt: new Date(FIXED_NOW) }),
        );
        const repository = await buildRepository({
          events: { create, createQueryBuilder, findOneByOrFail },
        });
        const occurredAt = new Date('2026-07-31T14:00:00.000Z');

        await repository.recordSkillUsage({
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
    describe('when the event was already stored', () => {
      it('inserts nothing and returns the surviving row by its tool_use_id key', async () => {
        const builder = insertBuilderMock([]);
        const findOneOrFail = vi
          .fn()
          .mockResolvedValue({ id: 'event-original' });
        const repository = await buildRepository({
          events: {
            create: vi.fn((input: Partial<SkillUsageEvent>) => input),
            createQueryBuilder: vi.fn().mockReturnValue(builder),
            findOneOrFail,
          },
        });

        const saved = await repository.recordSkillUsage({
          hookEventName: 'PreToolUse',
          occurredAt: new Date('2026-07-31T12:00:00.000Z'),
          scope: SKILL_USAGE_SCOPES.OURS,
          sessionId: 'session-1',
          skillName: 'ot-plans',
          source: 'claude-code',
          toolUseId: 'tool-1',
        });

        expect(builder.orIgnore).toHaveBeenCalled();
        expect(findOneOrFail).toHaveBeenCalledWith({
          where: expect.objectContaining({
            hookEventName: 'PreToolUse',
            sessionId: 'session-1',
            source: 'claude-code',
            toolUseId: 'tool-1',
          }),
        });
        expect(saved.id).toBe('event-original');
      });
    });
  });

  describe('listBySkill', () => {
    it('groups starts by skill_name + scope and merges outcome stats', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
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
        ],
      });
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            abandonedCount: '1',
            avgDurationMs: '1500.4',
            errorCount: '0',
            outcomeCount: '8',
            scope: SKILL_USAGE_SCOPES.OURS,
            sessionEndedCount: '0',
            skillName: 'ot-plans',
            successCount: '7',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await repository.listBySkill({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(eventsQb.groupBy).toHaveBeenCalledWith('e.skill_name');
      expect(eventsQb.limit).toHaveBeenCalledWith(50);

      // The two discriminators are the whole point of migrations 114/115: a
      // count that quietly readmits instrumentation probes or pre-fix
      // assumed-success rows is the bug, not a cosmetic difference.
      expect(eventsQb.andWhere).toHaveBeenCalledWith('e.is_fixture = FALSE');
      expect(outcomesQb.where).toHaveBeenCalledWith(
        'o.capture_model = :captureModel',
        { captureModel: 'reported_v1' },
      );
      expect(rows).toEqual([
        {
          abandonedCount: 1,
          avgDurationMs: 1500,
          count: 12,
          errorCount: 0,
          lastUsedAt: new Date('2026-07-30T09:00:00.000Z'),
          outcomeCount: 8,
          scope: SKILL_USAGE_SCOPES.OURS,
          sessionEndedCount: 0,
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
          sessionEndedCount: 0,
          skillName: 'vercel:deploy',
          successCount: 0,
        },
      ]);
    });

    it("does not merge one scope row's outcomes into another scope row of the same skill", async () => {
      // A personal skill whose history straddles the migration: 34 old
      // third-party starts and 1 new personal start, with outcomes recorded
      // only against the third-party half. Keying outcomes by skill_name alone
      // gave BOTH rows all 31 outcomes, rendering the impossible cell "31/1".
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            count: '34',
            lastUsedAt: '2026-09-16T01:39:07.600Z',
            scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
            skillName: 'ot-beta-loop',
          },
          {
            count: '1',
            lastUsedAt: '2026-09-16T02:37:43.113Z',
            scope: SKILL_USAGE_SCOPES.PERSONAL,
            skillName: 'ot-beta-loop',
          },
        ],
      });
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            abandonedCount: '4',
            avgDurationMs: '3830200',
            errorCount: '0',
            outcomeCount: '31',
            scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
            skillName: 'ot-beta-loop',
            successCount: '27',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await repository.listBySkill({
        end: '2026-09-16',
        start: '2026-08-17',
      });

      expect(rows[0]).toMatchObject({
        count: 34,
        outcomeCount: 31,
        scope: SKILL_USAGE_SCOPES.THIRD_PARTY,
      });
      // The personal row has its own (empty) outcome history, not the other
      // row's — an outcome count may never exceed its own start count.
      expect(rows[1]).toMatchObject({
        avgDurationMs: null,
        count: 1,
        outcomeCount: 0,
        scope: SKILL_USAGE_SCOPES.PERSONAL,
      });
    });

    it('groups outcomes by skill_name and scope so the join matches starts', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await repository.listBySkill({ end: '2026-07-31', start: '2026-07-01' });

      expect(outcomesQb.groupBy).toHaveBeenCalledWith('o.skill_name');
      expect(outcomesQb.addGroupBy).toHaveBeenCalledWith('o.scope');
    });

    it('merges a mixed automatic + opt-in feed and averages only non-null durations', async () => {
      // One skill, one aggregated outcome row that blends the automatic feed
      // (success + abandoned, abandoned having null duration) with an opt-in
      // `error`. Postgres AVG(duration_ms) ignores the null-duration abandoned
      // row, so avgDurationMs reflects only the timed outcomes.
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            count: '20',
            lastUsedAt: '2026-07-31T00:00:00.000Z',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ],
      });
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            abandonedCount: '3',
            avgDurationMs: '2000', // AVG over the 6 success + 1 error timed rows
            errorCount: '1',
            outcomeCount: '10',
            scope: SKILL_USAGE_SCOPES.OURS,
            sessionEndedCount: '0',
            skillName: 'ot-plans',
            successCount: '6',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await repository.listBySkill({
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
          sessionEndedCount: 0,
          skillName: 'ot-plans',
          successCount: 6,
        },
      ]);
    });

    describe('when the scope filter is set', () => {
      it('applies o.scope on the outcome query so the new feed is filtered', async () => {
        const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
        const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
        const repository = await buildRepository({
          events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
          outcomes: {
            createQueryBuilder: vi.fn().mockReturnValue(outcomesQb),
          },
        });

        await repository.listBySkill({
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
        const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
        const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
        const repository = await buildRepository({
          events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
          outcomes: {
            createQueryBuilder: vi.fn().mockReturnValue(outcomesQb),
          },
        });

        await repository.listBySkill({
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

  describe('when a repoIdentity filter is set', () => {
    it('matches starts directly and outcomes through their correlated start', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await repository.listBySkill({
        end: '2026-07-31',
        repoIdentity: 'https://github.com/org/repo',
        start: '2026-07-01',
      });

      expect(eventsQb.andWhere).toHaveBeenCalledWith(
        'e.repo_identity = :repoIdentity',
        { repoIdentity: 'https://github.com/org/repo' },
      );
      expect(outcomesQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('s.repo_identity = :repoIdentity'),
        { repoIdentity: 'https://github.com/org/repo' },
      );
    });
  });

  describe('when a skillName filter is set', () => {
    it('applies e.skill_name to starts and o.skill_name to outcomes', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await repository.listBySkill({
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
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            count: '4',
            lastUsedAt: '2026-07-29T18:30:00.000Z',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ],
      });
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await repository.listBySkill({
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
      const repository = await buildRepository({});

      const result = await repository.getUsageAggregation({
        end: '2026-07-31',
        skillName: 'does-not-exist',
        start: '2026-07-01',
      });

      expect(result.bySkill).toEqual([]);
      expect(result.byScope).toEqual([]);
      expect(result.byDay).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.filterOptions).toEqual({
        cwds: [],
        gitBranches: [],
        repoIdentities: [],
      });
    });
  });

  describe('when skillName is omitted', () => {
    it('adds no skill_name predicate on the start query', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await repository.listBySkill({ end: '2026-07-31', start: '2026-07-01' });

      const skillNamePredicate = eventsQb.andWhere.mock.calls.find(
        (call) => call[0] === 'e.skill_name = :skillName',
      );
      expect(skillNamePredicate).toBeUndefined();
    });
  });

  describe('listByScope', () => {
    it('returns ours vs personal vs third-party counts', async () => {
      // Grouping is by the column itself, so a new scope member needs no
      // widening here — it simply arrives as another row.
      const qb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          { count: '10', scope: SKILL_USAGE_SCOPES.OURS },
          { count: '7', scope: SKILL_USAGE_SCOPES.PERSONAL },
          { count: '4', scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await repository.listByScope({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows).toEqual([
        { count: 10, scope: SKILL_USAGE_SCOPES.OURS },
        { count: 7, scope: SKILL_USAGE_SCOPES.PERSONAL },
        { count: 4, scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
      ]);
    });

    it('does not fall back to ours for an unrecognized stored scope', async () => {
      // Falling back to ours would inflate the count of skills we authored —
      // the number people actually act on. third-party matches how capture
      // itself fails open.
      const qb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ count: '3', scope: 'not-a-real-scope' }],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await repository.listByScope({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows).toEqual([
        { count: 3, scope: SKILL_USAGE_SCOPES.THIRD_PARTY },
      ]);
    });
  });

  describe('listCaptureHealth', () => {
    it('maps event and outcome sources to stream-tagged rows', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            lastCapturedAt: new Date('2026-10-29T10:00:00.000Z'),
            source: 'claude-code',
          },
          { lastCapturedAt: '2026-10-28T08:00:00.000Z', source: 'unknown' },
        ],
      });
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            lastCapturedAt: new Date('2026-10-27T09:00:00.000Z'),
            source: 'cursor',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      const rows = await repository.listCaptureHealth();

      expect(rows).toEqual([
        {
          lastCapturedAt: new Date('2026-10-29T10:00:00.000Z'),
          source: 'claude-code',
          stream: 'skill_events',
        },
        {
          lastCapturedAt: new Date('2026-10-28T08:00:00.000Z'),
          source: 'unknown',
          stream: 'skill_events',
        },
        {
          lastCapturedAt: new Date('2026-10-27T09:00:00.000Z'),
          source: 'cursor',
          stream: 'skill_outcomes',
        },
      ]);
    });

    it('takes MAX(received_at) grouped by a NULL-safe source and excludes fixtures', async () => {
      const eventsQb = createQueryBuilderMock<SkillUsageEvent>();
      const outcomesQb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(eventsQb) },
        outcomes: { createQueryBuilder: vi.fn().mockReturnValue(outcomesQb) },
      });

      await repository.listCaptureHealth();

      expect(eventsQb.select).toHaveBeenCalledWith(
        expect.stringContaining(`'unknown'`),
        'source',
      );
      expect(eventsQb.addSelect).toHaveBeenCalledWith(
        'MAX(e.received_at)',
        'lastCapturedAt',
      );
      expect(eventsQb.where).toHaveBeenCalledWith('e.is_fixture = FALSE');
      expect(eventsQb.groupBy).toHaveBeenCalledWith(
        expect.stringContaining('e.source'),
      );
      expect(outcomesQb.addSelect).toHaveBeenCalledWith(
        'MAX(o.received_at)',
        'lastCapturedAt',
      );
      expect(outcomesQb.groupBy).toHaveBeenCalledWith(
        expect.stringContaining('o.source'),
      );
    });

    describe('when nothing has been captured', () => {
      it('returns no rows', async () => {
        const repository = await buildRepository({});

        await expect(repository.listCaptureHealth()).resolves.toEqual([]);
      });
    });
  });

  describe('listByDay', () => {
    it('maps per-day ours/personal/third-party/total counts', async () => {
      const qb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            date: '2026-07-15',
            injectedCount: '3',
            oursCount: '2',
            personalCount: '4',
            thirdPartyCount: '1',
            totalCount: '7',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await repository.listByDay({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows).toEqual([
        {
          date: '2026-07-15',
          injectedCount: 3,
          oursCount: 2,
          personalCount: 4,
          thirdPartyCount: 1,
          totalCount: 7,
        },
      ]);
    });

    it('selects one COUNT FILTER per scope member', async () => {
      const qb = createQueryBuilderMock<SkillUsageEvent>();
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      await repository.listByDay({ end: '2026-07-31', start: '2026-07-01' });

      const aliases = qb.addSelect.mock.calls.flatMap((call) => {
        return call.slice(1);
      });
      expect(aliases).toEqual(
        expect.arrayContaining([
          'injectedCount',
          'oursCount',
          'personalCount',
          'thirdPartyCount',
        ]),
      );
    });

    it('reports a zero count for a scope absent from the window', async () => {
      const qb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            date: '2026-07-15',
            oursCount: '2',
            thirdPartyCount: '1',
            totalCount: '3',
          },
        ],
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      const rows = await repository.listByDay({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(rows[0]?.personalCount).toBe(0);
      expect(rows[0]?.injectedCount).toBe(0);
    });
  });

  describe('getUsageAggregation', () => {
    it('composes bySkill/byScope/byDay/totalCount/filterOptions', async () => {
      const skillQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            count: '5',
            scope: SKILL_USAGE_SCOPES.OURS,
            skillName: 'ot-plans',
          },
        ],
      });
      const outcomeQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [],
      });
      const scopeQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ count: '5', scope: SKILL_USAGE_SCOPES.OURS }],
      });
      const dayQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [
          {
            date: '2026-07-15',
            injectedCount: '1',
            oursCount: '5',
            personalCount: '2',
            thirdPartyCount: '0',
            totalCount: '7',
          },
        ],
      });
      const countQb = createQueryBuilderMock<SkillUsageEvent>({
        rawOne: { count: '5' },
      });
      const branchQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ value: 'main' }],
      });
      const cwdQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ value: '/repo' }],
      });
      const repoQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ value: 'https://github.com/org/repo' }],
      });

      const eventsCreateQueryBuilder = vi
        .fn()
        .mockReturnValueOnce(skillQb)
        .mockReturnValueOnce(scopeQb)
        .mockReturnValueOnce(dayQb)
        .mockReturnValueOnce(countQb)
        .mockReturnValueOnce(branchQb)
        .mockReturnValueOnce(cwdQb)
        .mockReturnValueOnce(repoQb);

      const repository = await buildRepository({
        events: { createQueryBuilder: eventsCreateQueryBuilder },
        outcomes: {
          createQueryBuilder: vi.fn().mockReturnValue(outcomeQb),
        },
      });
      const result = await repository.getUsageAggregation({
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
          sessionEndedCount: 0,
          skillName: 'ot-plans',
          successCount: 0,
        },
      ]);
      expect(result.byScope).toEqual([
        { count: 5, scope: SKILL_USAGE_SCOPES.OURS },
      ]);
      expect(result.byDay).toEqual([
        {
          date: '2026-07-15',
          injectedCount: 1,
          oursCount: 5,
          personalCount: 2,
          thirdPartyCount: 0,
          totalCount: 7,
        },
      ]);
      expect(result.filterOptions).toEqual({
        cwds: ['/repo'],
        gitBranches: ['main'],
        repoIdentities: ['https://github.com/org/repo'],
      });
    });
  });
  describe('listFilterOptions', () => {
    it('caps every option list so the deprecated fields stay bounded', async () => {
      const branchQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ value: 'main' }],
      });
      const cwdQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [{ value: '/repo' }],
      });
      const repoQb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: [],
      });
      const repository = await buildRepository({
        events: {
          createQueryBuilder: vi
            .fn()
            .mockReturnValueOnce(branchQb)
            .mockReturnValueOnce(cwdQb)
            .mockReturnValueOnce(repoQb),
        },
      });

      await repository.listFilterOptions({
        end: '2026-07-31',
        start: '2026-07-01',
      });

      expect(branchQb.limit).toHaveBeenCalledWith(50);
      expect(cwdQb.limit).toHaveBeenCalledWith(50);
      expect(repoQb.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('searchGitBranches', () => {
    const buildBranchRepository = async (
      rows: ReadonlyArray<Record<string, unknown>>,
    ): Promise<{
      qb: QueryBuilderMock<SkillUsageEvent>;
      repository: SkillUsageEventsRepository;
    }> => {
      const qb = createQueryBuilderMock<SkillUsageEvent>({
        rawMany: rows,
      });
      const repository = await buildRepository({
        events: { createQueryBuilder: vi.fn().mockReturnValue(qb) },
      });

      return { qb, repository };
    };

    it('ranks the default branches in SQL and maps counts to numbers', async () => {
      const { qb, repository } = await buildBranchRepository([
        { branch: 'main', count: '12' },
        { branch: 'alpha', count: '3' },
      ]);

      const result = await repository.searchGitBranches({
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
        const { repository } = await buildBranchRepository([
          { branch: 'master', count: '9' },
          { branch: 'alpha', count: '1' },
        ]);

        const result = await repository.searchGitBranches({
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
        const { qb, repository } = await buildBranchRepository([]);

        await repository.searchGitBranches({
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
        const { qb, repository } = await buildBranchRepository([]);

        await repository.searchGitBranches({
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
        const { qb, repository } = await buildBranchRepository([]);

        await repository.searchGitBranches({
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
        const { qb, repository } = await buildBranchRepository([]);

        await repository.searchGitBranches({
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
        const { repository } = await buildBranchRepository([
          { branch: 'main', count: '3' },
          { branch: 'alpha', count: '2' },
          { branch: 'beta', count: '1' },
        ]);

        const result = await repository.searchGitBranches({
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
        const { qb, repository } = await buildBranchRepository([]);

        await repository.searchGitBranches({
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
        const { repository } = await buildBranchRepository([]);

        await expect(
          repository.searchGitBranches({
            end: '2026-07-31',
            start: '2026-07-01',
          }),
        ).resolves.toEqual({ hasMore: false, items: [] });
      });
    });
  });
});
