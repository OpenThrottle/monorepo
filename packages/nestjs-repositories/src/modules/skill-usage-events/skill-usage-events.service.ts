/**
 * @description Typed persistence for skill_usage_events — harness-captured
 * skill invocations (ours + third-party). Owns writes from the ingest mutation
 * and read/aggregation for the Developer Usage surface. Stores args exactly as
 * the client sent them (already privacy-processed).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEvent,
  type SkillUsagePrivacyLevel,
  type SkillUsageScope,
} from './skill-usage-events.entity';

/**
 * One skill-usage event to persist. Mirrors the Phase 1 JSONL shape; `args`
 * must already be privacy-processed by the client (server never re-expands).
 */
export interface RecordSkillUsageInput {
  readonly agentId?: string | null;
  readonly agentType?: string | null;
  readonly args?: string | null;
  readonly cwd?: string | null;
  readonly gitBranch?: string | null;
  readonly hookEventName?: string | null;
  readonly invocationPath?: string | null;
  readonly occurredAt: Date;
  readonly privacyLevel?: SkillUsagePrivacyLevel;
  readonly promptId?: string | null;
  readonly scope: SkillUsageScope;
  readonly sessionId?: string | null;
  readonly skillName: string;
  readonly toolUseId?: string | null;
}

/**
 * Aggregation window for skill usage. `start`/`end` are inclusive YYYY-MM-DD
 * days (UTC). Optional filters narrow by scope, git branch, or working dir.
 */
export interface SkillUsageRangeQuery {
  readonly cwd?: string | null;
  readonly end: string;
  readonly gitBranch?: string | null;
  readonly scope?: SkillUsageScope | null;
  readonly start: string;
}

/** Count of invocations for one skill (+ its scope label). */
export interface SkillUsageBySkillRow {
  readonly count: number;
  readonly scope: SkillUsageScope;
  readonly skillName: string;
}

/** Count of invocations for one scope (ours | third-party). */
export interface SkillUsageByScopeRow {
  readonly count: number;
  readonly scope: SkillUsageScope;
}

/** Per-UTC-day invocation counts, split by scope. */
export interface SkillUsageByDayRow {
  readonly date: string;
  readonly oursCount: number;
  readonly thirdPartyCount: number;
  readonly totalCount: number;
}

/** Distinct filter values present in the (unfiltered-by-branch/cwd) range. */
export interface SkillUsageFilterOptions {
  readonly cwds: readonly string[];
  readonly gitBranches: readonly string[];
}

/** Full aggregation payload for the skillUsage GraphQL query. */
export interface SkillUsageAggregation {
  readonly byDay: readonly SkillUsageByDayRow[];
  readonly byScope: readonly SkillUsageByScopeRow[];
  readonly bySkill: readonly SkillUsageBySkillRow[];
  readonly filterOptions: SkillUsageFilterOptions;
  readonly totalCount: number;
}

/** Day after `end` (YYYY-MM-DD) as an ISO instant, for a half-open [start, endExclusive) range. */
const exclusiveEndInstant = (end: string): string => {
  const date = new Date(`${end}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString();
};

/** COUNT/SUM raw → number, coalescing NULL (no rows) to 0. */
const toNumber = (value: unknown): number =>
  value == null ? 0 : Number(value);

/** Narrow a raw SQL scope value to SkillUsageScope; fall back to ours. */
const toSkillUsageScope = (value: unknown): SkillUsageScope => {
  if (
    value === SKILL_USAGE_SCOPES.OURS ||
    value === SKILL_USAGE_SCOPES.THIRD_PARTY
  ) {
    return value;
  }

  return SKILL_USAGE_SCOPES.OURS;
};

/** Cap the leaderboard so a noisy window stays UI-friendly. */
const BY_SKILL_LIMIT = 50;

@Injectable()
export class SkillUsageEventsService {
  constructor(
    @InjectRepository(SkillUsageEvent)
    private readonly eventsRepository: Repository<SkillUsageEvent>,
  ) {}

  /** The underlying repository, for read/aggregate access by consumers. */
  getRepository(): Repository<SkillUsageEvent> {
    return this.eventsRepository;
  }

  /**
   * Insert one skill-usage event. Args are stored as-sent (client privacy
   * seam already applied). Returns the saved row.
   */
  async recordSkillUsage(
    input: RecordSkillUsageInput,
  ): Promise<SkillUsageEvent> {
    const row = this.eventsRepository.create({
      agentId: input.agentId ?? null,
      agentType: input.agentType ?? null,
      args: input.args ?? null,
      cwd: input.cwd ?? null,
      gitBranch: input.gitBranch ?? null,
      hookEventName: input.hookEventName ?? null,
      invocationPath: input.invocationPath ?? null,
      occurredAt: input.occurredAt,
      privacyLevel: input.privacyLevel ?? SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
      promptId: input.promptId ?? null,
      scope: input.scope,
      sessionId: input.sessionId ?? null,
      skillName: input.skillName,
      toolUseId: input.toolUseId ?? null,
    });

    return this.eventsRepository.save(row);
  }

  /**
   * Aggregated skill usage over `[start, end]` (inclusive days, UTC): top
   * skills, ours-vs-third-party split, per-day series, and filter option lists.
   * Branch/cwd filters apply to the aggregates; filterOptions are computed
   * over the same date range without those two filters so the dropdowns stay
   * populated while a filter is active.
   */
  async getUsageAggregation(
    query: SkillUsageRangeQuery,
  ): Promise<SkillUsageAggregation> {
    const [bySkill, byScope, byDay, totalCount, filterOptions] =
      await Promise.all([
        this.listBySkill(query),
        this.listByScope(query),
        this.listByDay(query),
        this.countInRange(query),
        this.listFilterOptions({ end: query.end, start: query.start }),
      ]);

    return { byDay, byScope, bySkill, filterOptions, totalCount };
  }

  /** Top skills by invocation count (skill_name + scope), highest first. */
  async listBySkill(
    query: SkillUsageRangeQuery,
  ): Promise<SkillUsageBySkillRow[]> {
    const rows = await this.rangeQuery(query)
      .select('e.skill_name', 'skillName')
      .addSelect('e.scope', 'scope')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.skill_name')
      .addGroupBy('e.scope')
      .orderBy('count', 'DESC')
      .addOrderBy('e.skill_name', 'ASC')
      .limit(BY_SKILL_LIMIT)
      .getRawMany<Record<string, unknown>>();

    return rows.map((row) => ({
      count: toNumber(row.count),
      scope: toSkillUsageScope(row.scope),
      skillName: String(row.skillName),
    }));
  }

  /** Invocation counts grouped by scope (ours | third-party). */
  async listByScope(
    query: SkillUsageRangeQuery,
  ): Promise<SkillUsageByScopeRow[]> {
    const rows = await this.rangeQuery(query)
      .select('e.scope', 'scope')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.scope')
      .orderBy('e.scope', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((row) => ({
      count: toNumber(row.count),
      scope: toSkillUsageScope(row.scope),
    }));
  }

  /** Per-UTC-day counts with ours / third-party split. */
  async listByDay(query: SkillUsageRangeQuery): Promise<SkillUsageByDayRow[]> {
    const rows = await this.rangeQuery(query)
      .select(
        `to_char(date_trunc('day', e.occurred_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE e.scope = '${SKILL_USAGE_SCOPES.OURS}')`,
        'oursCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE e.scope = '${SKILL_USAGE_SCOPES.THIRD_PARTY}')`,
        'thirdPartyCount',
      )
      .addSelect('COUNT(*)', 'totalCount')
      .groupBy(`date_trunc('day', e.occurred_at AT TIME ZONE 'UTC')`)
      .orderBy(`date_trunc('day', e.occurred_at AT TIME ZONE 'UTC')`, 'ASC')
      .getRawMany<Record<string, unknown>>();

    return rows.map((row) => ({
      date: String(row.date),
      oursCount: toNumber(row.oursCount),
      thirdPartyCount: toNumber(row.thirdPartyCount),
      totalCount: toNumber(row.totalCount),
    }));
  }

  /** Total invocation count for the filtered range. */
  async countInRange(query: SkillUsageRangeQuery): Promise<number> {
    const raw = await this.rangeQuery(query)
      .select('COUNT(*)', 'count')
      .getRawOne<Record<string, unknown>>();

    return toNumber(raw?.count);
  }

  /**
   * Distinct non-null git branches and cwds in the date window (no branch/cwd
   * filter applied — those are the values the UI offers as filter options).
   */
  async listFilterOptions(query: {
    readonly end: string;
    readonly start: string;
  }): Promise<SkillUsageFilterOptions> {
    const [branchRows, cwdRows] = await Promise.all([
      this.dateRangeQuery(query)
        .select('DISTINCT e.git_branch', 'value')
        .andWhere('e.git_branch IS NOT NULL')
        .andWhere(`e.git_branch <> ''`)
        .orderBy('e.git_branch', 'ASC')
        .getRawMany<{ value: string }>(),
      this.dateRangeQuery(query)
        .select('DISTINCT e.cwd', 'value')
        .andWhere('e.cwd IS NOT NULL')
        .andWhere(`e.cwd <> ''`)
        .orderBy('e.cwd', 'ASC')
        .getRawMany<{ value: string }>(),
    ]);

    return {
      cwds: cwdRows.map((row) => row.value),
      gitBranches: branchRows.map((row) => row.value),
    };
  }

  /** Shared date-window filter (no optional scope/branch/cwd). */
  private dateRangeQuery(query: {
    readonly end: string;
    readonly start: string;
  }): SelectQueryBuilder<SkillUsageEvent> {
    return this.eventsRepository
      .createQueryBuilder('e')
      .where('e.occurred_at >= :start', { start: query.start })
      .andWhere('e.occurred_at < :endExclusive', {
        endExclusive: exclusiveEndInstant(query.end),
      });
  }

  /** Date window + optional scope / gitBranch / cwd filters. */
  private rangeQuery(
    query: SkillUsageRangeQuery,
  ): SelectQueryBuilder<SkillUsageEvent> {
    const qb = this.dateRangeQuery(query);

    if (query.scope != null) {
      qb.andWhere('e.scope = :scope', { scope: query.scope });
    }

    if (query.gitBranch != null && query.gitBranch !== '') {
      qb.andWhere('e.git_branch = :gitBranch', { gitBranch: query.gitBranch });
    }

    if (query.cwd != null && query.cwd !== '') {
      qb.andWhere('e.cwd = :cwd', { cwd: query.cwd });
    }

    return qb;
  }
}
