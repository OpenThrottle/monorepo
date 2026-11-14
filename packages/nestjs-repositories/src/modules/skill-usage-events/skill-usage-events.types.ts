import type {
  SkillUsagePrivacyLevel,
  SkillUsageScope,
} from './skill-usage-events.entity.ts';
import type { SkillUsageOutcomeValue } from './skill-usage-outcomes.entity.ts';

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
 * Opt-in outcome enrichment for a skill we author. Correlates to a start
 * event via sessionId + skillName (and optionally toolUseId).
 */
export interface RecordSkillUsageOutcomeInput {
  readonly cwd?: string | null;
  /**
   * True when the sender is a deliberate reporter. A `success`/`error` claim
   * without it is stored as `legacy_assumed_success` (a stale pre-#537 bundle
   * hardcoded `success`); `session_ended`/`abandoned` make no quality claim
   * and are always `reported_v1`.
   */
  readonly deliberate?: boolean | null;
  readonly durationMs?: number | null;
  readonly gitBranch?: string | null;
  readonly occurredAt: Date;
  readonly outcome: SkillUsageOutcomeValue;
  readonly scope?: SkillUsageScope;
  readonly sessionId?: string | null;
  readonly skillName: string;
  readonly source?: string | null;
  readonly toolUseId?: string | null;
}

/**
 * Aggregation window for skill usage. `start`/`end` are inclusive YYYY-MM-DD
 * days (UTC). Optional filters narrow by scope, git branch, or working dir.
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

/** Count of invocations for one skill (+ its scope label) with outcome stats. */
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

/** Count of invocations for one scope (ours | personal | third-party). */
export interface SkillUsageByScopeRow {
  readonly count: number;
  readonly scope: SkillUsageScope;
}

/**
 * Per-UTC-day invocation counts, split by scope. `injectedCount` counts OpenThrottle skills linked in from
 * another repository by foreign skill injection. `thirdPartyCount` excludes
 * personal invocations — before the personal member existed they were counted
 * here, and historical rows are never reclassified, so a personal skill's
 * series can legitimately straddle both columns across the migration date.
 */
export interface SkillUsageByDayRow {
  readonly date: string;
  readonly injectedCount: number;
  readonly oursCount: number;
  readonly personalCount: number;
  readonly thirdPartyCount: number;
  readonly totalCount: number;
}

/** Distinct filter values present in the (unfiltered-by-branch/cwd) range. */
export interface SkillUsageFilterOptions {
  readonly cwds: readonly string[];
  readonly gitBranches: readonly string[];
  readonly repoIdentities: readonly string[];
}

/** One git branch seen in the window, with its invocation count. */
export interface SkillUsageGitBranchRow {
  readonly branch: string;
  readonly count: number;
}

/** A capped page of branch matches; `hasMore` means "keep typing to narrow". */
export interface SkillUsageGitBranchSearchResult {
  readonly hasMore: boolean;
  readonly items: readonly SkillUsageGitBranchRow[];
}

/** Lazy branch-search window: date range plus an optional ILIKE needle. */
export interface SkillUsageGitBranchSearchQuery {
  readonly end: string;
  readonly limit?: number | null;
  readonly query?: string | null;
  readonly skillName?: string | null;
  readonly start: string;
}

/** Full aggregation payload for the skillUsage GraphQL query. */
export interface SkillUsageAggregation {
  readonly byDay: readonly SkillUsageByDayRow[];
  readonly byScope: readonly SkillUsageByScopeRow[];
  readonly bySkill: readonly SkillUsageBySkillRow[];
  readonly filterOptions: SkillUsageFilterOptions;
  readonly totalCount: number;
}
