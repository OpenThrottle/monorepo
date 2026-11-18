import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SkillUsageEvent } from './skill-usage-event.entity.ts';
import type {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
} from './skill-usage-events.constants.ts';
import type { SkillUsageEventsRepository } from './skill-usage-events.repository.ts';

/**
 * @description Who a captured invocation belongs to; see {@link SKILL_USAGE_SCOPES}.
 * @public
 */
export type SkillUsageScope =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES];

/**
 * @description How much of a skill invocation's args the client kept.
 * @public
 */
export type SkillUsagePrivacyLevel =
  (typeof SKILL_USAGE_PRIVACY_LEVELS)[keyof typeof SKILL_USAGE_PRIVACY_LEVELS];

/**
 * @description Plain-object shape of a skill_usage_events row.
 * @public
 */
export interface SkillUsageEventData {
  readonly agentId: string | null;
  readonly agentType: string | null;
  readonly args: string | null;
  readonly cwd: string | null;
  readonly gitBranch: string | null;
  readonly hookEventName: string | null;
  readonly id: string;
  readonly invocationPath: string | null;
  readonly occurredAt: Date;
  readonly privacyLevel: SkillUsagePrivacyLevel;
  readonly promptId: string | null;
  readonly receivedAt: Date;
  readonly repoIdentity: string | null;
  readonly scope: SkillUsageScope;
  readonly sessionId: string | null;
  readonly skillName: string;
  readonly source: string | null;
  readonly toolUseId: string | null;
  readonly userId: string | null;
}

/**
 * @description One skill-usage event to persist. Mirrors the Phase 1 JSONL shape; `args`
 * must already be privacy-processed by the client (server never re-expands).
 * @public
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
  /** Normalized git remote (normalizeRemoteUrl output), or null. */
  readonly repoIdentity?: string | null;
  readonly scope: SkillUsageScope;
  readonly sessionId?: string | null;
  readonly skillName: string;
  readonly source?: string | null;
  readonly toolUseId?: string | null;
  /**
   * Resolved server-side from the authenticated principal — never accepted
   * from the client. Null when no principal resolves.
   */
  readonly userId?: string | null;
}

/**
 * @description Aggregation window for skill usage. `start`/`end` are inclusive YYYY-MM-DD
 * days (UTC). Optional filters narrow by scope, git branch, or working dir.
 * @public
 */
export interface SkillUsageRangeQuery {
  /** Deprecated path filter; prefer {@link SkillUsageRangeQuery.repoIdentity}. */
  readonly cwd?: string | null;
  readonly end: string;
  readonly gitBranch?: string | null;
  /** Normalized git remote; narrows events, and outcomes via their start. */
  readonly repoIdentity?: string | null;
  readonly scope?: SkillUsageScope | null;
  /** Restrict every aggregate to a single skill (detail view); omit for all. */
  readonly skillName?: string | null;
  readonly start: string;
}

/**
 * @description Count of invocations for one skill (+ its scope label) with outcome stats.
 * @public
 */
export interface SkillUsageBySkillRow {
  readonly abandonedCount: number;
  readonly avgDurationMs: number | null;
  readonly count: number;
  readonly errorCount: number;
  /** Most recent start (invocation) time in the filtered window; null if none. */
  readonly lastUsedAt: Date | null;
  /**
   * QUALITY outcomes only — `success` + `error`. Deliberately excludes
   * `session_ended` and `abandoned`, which report whether the process finished,
   * not whether the skill's work went well. Counting those here is exactly the
   * bug this replaced: it made every clean session end look like a measured win.
   */
  readonly outcomeCount: number;
  readonly scope: SkillUsageScope;
  /** Automatic session-end records. Liveness, not quality — never in `outcomeCount`. */
  readonly sessionEndedCount: number;
  readonly skillName: string;
  readonly successCount: number;
}

/**
 * @description Count of invocations for one scope (ours | personal | third-party).
 * @public
 */
export interface SkillUsageByScopeRow {
  readonly count: number;
  readonly scope: SkillUsageScope;
}

/**
 * @description Per-UTC-day invocation counts, split by scope. `injectedCount` counts OpenThrottle skills linked in from
 * another repository by foreign skill injection. `thirdPartyCount` excludes
 * personal invocations — before the personal member existed they were counted
 * here, and historical rows are never reclassified, so a personal skill's
 * series can legitimately straddle both columns across the migration date.
 * @public
 */
export interface SkillUsageByDayRow {
  readonly date: string;
  readonly injectedCount: number;
  readonly oursCount: number;
  readonly personalCount: number;
  readonly thirdPartyCount: number;
  readonly totalCount: number;
}

/**
 * @description Distinct filter values present in the (unfiltered-by-branch/cwd) range.
 * @public
 */
export interface SkillUsageFilterOptions {
  readonly cwds: readonly string[];
  readonly gitBranches: readonly string[];
  readonly repoIdentities: readonly string[];
}

/**
 * @description One git branch seen in the window, with its invocation count.
 * @public
 */
export interface SkillUsageGitBranchRow {
  readonly branch: string;
  readonly count: number;
}

/**
 * @description A capped page of branch matches; `hasMore` means "keep typing to narrow".
 * @public
 */
export interface SkillUsageGitBranchSearchResult {
  readonly hasMore: boolean;
  readonly items: readonly SkillUsageGitBranchRow[];
}

/**
 * @description Lazy branch-search window: date range plus an optional ILIKE needle.
 * @public
 */
export interface SkillUsageGitBranchSearchQuery {
  readonly end: string;
  readonly limit?: number | null;
  readonly query?: string | null;
  readonly skillName?: string | null;
  readonly start: string;
}

/**
 * @description Full aggregation payload for the skillUsage GraphQL query.
 * @public
 */
export interface SkillUsageAggregation {
  readonly byDay: readonly SkillUsageByDayRow[];
  readonly byScope: readonly SkillUsageByScopeRow[];
  readonly bySkill: readonly SkillUsageBySkillRow[];
  readonly filterOptions: SkillUsageFilterOptions;
  readonly totalCount: number;
}

/**
 * @description A {@link SkillUsageEventsRepository} mock: every inherited
 * `BaseRepository` method plus the skill-usage-events ones.
 * @public
 */
export interface SkillUsageEventsRepositoryMock extends BaseRepositoryMock<
  SkillUsageEvent,
  CreateModelInput<SkillUsageEvent>
> {
  readonly countInRange: Mock<SkillUsageEventsRepository['countInRange']>;
  readonly getUsageAggregation: Mock<
    SkillUsageEventsRepository['getUsageAggregation']
  >;
  readonly listByDay: Mock<SkillUsageEventsRepository['listByDay']>;
  readonly listByScope: Mock<SkillUsageEventsRepository['listByScope']>;
  readonly listBySkill: Mock<SkillUsageEventsRepository['listBySkill']>;
  readonly listCaptureHealth: Mock<
    SkillUsageEventsRepository['listCaptureHealth']
  >;
  readonly listFilterOptions: Mock<
    SkillUsageEventsRepository['listFilterOptions']
  >;
  readonly recordSkillUsage: Mock<
    SkillUsageEventsRepository['recordSkillUsage']
  >;
  readonly searchGitBranches: Mock<
    SkillUsageEventsRepository['searchGitBranches']
  >;
}
