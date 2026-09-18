import type pg from 'pg';

import type { CapabilityProbe } from './capability-probe.ts';
import type { LabelCount } from './count-types.ts';
import type { ReportWindow } from './envelope.ts';
import type { MetricContext, MetricQuery } from './metric-registry.ts';

/**
 * @description Skill-usage aggregate metrics (`metrics.skill_usage`, sourced
 * from `skill_usage_events` alone) and skill-usage outcome metrics
 * (`metrics.skill_usage_outcomes`, which additionally needs
 * `skill_usage_outcomes` and the start↔outcome correlation), registered as
 * two separate {@link MetricQuery}s so a database that has starts but no
 * outcome enrichment yet still gets the events-only family. Every query here
 * selects counts, labels, or durations only — NEVER `args`, `cwd`,
 * `git_branch`, or `invocation_path`, which is exactly the set SKILL.md's
 * privacy contract forbids from the default output.
 *
 * Correlation rule: `skill_usage_outcomes.entity.ts` and migrations 085/112
 * document the join as "session_id + skill_name (tool_use_id optional, for a
 * tighter match)" — the same rule `packages/agentic-hooks/src/data/jsonl.ts`'s
 * `startCorrelationKey` encodes client-side. There is no time-proximity join
 * anywhere in the codebase for this pair of tables, so none is invented here:
 * an event matches an outcome when `tool_use_id` is present on the event and
 * equal on both sides, or — when the event has no `tool_use_id` — when
 * `session_id` + `skill_name` agree (and the outcome also has no
 * `tool_use_id`, so a tightly-correlated outcome never gets claimed by a
 * looser match).
 */

/** Invocation count for one (skill_name, scope) pair. */
export interface SkillUsageBySkillRow {
  readonly count: number;
  readonly scope: string;
  readonly skillName: string;
}

/** Spread of invocations-per-session over every session seen in the window. */
export interface SessionInvocationStats {
  readonly distinctSessionCount: number;
  readonly max: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly p90: number | null;
}

/** One UTC calendar day's invocation count. */
export interface DailyInvocationCount {
  readonly count: number;
  readonly date: string;
}

export interface SkillUsageMetrics {
  readonly agentTypes: readonly LabelCount[];
  readonly bySkill: readonly SkillUsageBySkillRow[];
  readonly dailyInvocations: readonly DailyInvocationCount[];
  readonly hookEventNames: readonly LabelCount[];
  readonly privacyLevels: readonly LabelCount[];
  readonly sessionInvocations: SessionInvocationStats;
  readonly totalInWindow: number;
}

/** Outcome mix (`success` / `abandoned` / `error` / …) for one skill. */
export interface SkillOutcomeMixRow {
  readonly count: number;
  readonly outcome: string;
  readonly skillName: string;
}

/** Duration percentiles for one skill, from rows that reported a `duration_ms`. */
export interface SkillDurationStats {
  readonly medianMs: number | null;
  readonly p90Ms: number | null;
  readonly p99Ms: number | null;
  readonly sampleCount: number;
  readonly skillName: string;
}

/**
 * Every event in the window bucketed by what outcome evidence it has. The three
 * counts partition `skill_usage.totalInWindow`, so the outcome picture always
 * reconciles against the invocation count.
 *
 * This exists because `outcomeMixOverall` deliberately counts only
 * `reported_v1` outcomes — a `legacy_assumed_success` row's `success` was a
 * hardcoded default, not a measurement. Without `legacyAssumedOnly` broken out,
 * those events look matched to the unmatched query and simply vanish: on the
 * authoring box that silently hid 572 of 723 invocations.
 */
export interface EventOutcomeCoverage {
  /** Events whose only correlated outcome predates the capture fix (migration 124). */
  readonly legacyAssumedOnly: number;
  /** Events with no correlated outcome row at all — the abandonment signal. */
  readonly noOutcome: number;
  /**
   * Events with at least one genuinely reported outcome correlated to them.
   * Counts EVENTS, so it will not equal `outcomeMixOverall`, which counts
   * OUTCOME ROWS whose own timestamp falls in the window — an outcome landing
   * just after the window still matches its event, and one event may correlate
   * to more than one outcome row.
   */
  readonly reported: number;
}

export interface SkillUsageOutcomeMetrics {
  readonly durationsBySkill: readonly SkillDurationStats[];
  /** @see EventOutcomeCoverage — partitions `skill_usage.totalInWindow`. */
  readonly eventOutcomeCoverage: EventOutcomeCoverage;
  readonly outcomeMixBySkill: readonly SkillOutcomeMixRow[];
  readonly outcomeMixOverall: readonly LabelCount[];
  /** `null` when the DB predates migration 112 (`skill_usage_outcomes.source`). */
  readonly outcomesBySource: readonly LabelCount[] | null;
}

/** Cap the leaderboard so a noisy window stays shareable. */
const BY_SKILL_LIMIT = 50;

/** `AND is_fixture = FALSE` when the column exists (migration 125), else nothing. */
function fixtureExclusionClause(probe: CapabilityProbe): string {
  return probe.hasColumns('skill_usage_events', ['is_fixture'])
    ? 'AND e.is_fixture = FALSE'
    : '';
}

/**
 * `AND capture_model = 'reported_v1'` when the column exists (migration 124),
 * else nothing. Excludes the pre-fix rows wholesale — their `success` was a
 * hardcoded default and their `duration_ms` is session-tail length, not a
 * measurement — matching how the production Usage aggregation already treats
 * them (`skill-usage-events.service.ts`).
 */
function reportedOnlyClause(probe: CapabilityProbe): string {
  return probe.hasColumns('skill_usage_outcomes', ['capture_model'])
    ? `AND o.capture_model = 'reported_v1'`
    : '';
}

async function countTotalInWindow(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count
     FROM skill_usage_events e
     WHERE e.occurred_at >= $1 AND e.occurred_at < $2
       ${fixtureExclusionClause(probe)}`,
    [window.since, window.until],
  );
  return rows[0]?.count ?? 0;
}

async function countBySkillAndScope(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly SkillUsageBySkillRow[]> {
  const { rows } = await client.query<SkillUsageBySkillRow>(
    `SELECT e.skill_name AS "skillName", e.scope AS scope, count(*)::int AS count
     FROM skill_usage_events e
     WHERE e.occurred_at >= $1 AND e.occurred_at < $2
       ${fixtureExclusionClause(probe)}
     GROUP BY e.skill_name, e.scope
     ORDER BY count DESC, e.skill_name ASC, e.scope ASC
     LIMIT ${BY_SKILL_LIMIT}`,
    [window.since, window.until],
  );
  return rows;
}

async function sessionInvocationStats(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<SessionInvocationStats> {
  const { rows } = await client.query<{
    distinctSessionCount: number;
    max: number | null;
    median: number | null;
    min: number | null;
    p90: number | null;
  }>(
    `WITH per_session AS (
       SELECT e.session_id, count(*)::int AS invocation_count
       FROM skill_usage_events e
       WHERE e.occurred_at >= $1 AND e.occurred_at < $2
         AND e.session_id IS NOT NULL
         ${fixtureExclusionClause(probe)}
       GROUP BY e.session_id
     )
     SELECT
       count(*)::int AS "distinctSessionCount",
       min(invocation_count)::int AS min,
       max(invocation_count)::int AS max,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY invocation_count) AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY invocation_count) AS p90
     FROM per_session`,
    [window.since, window.until],
  );

  const row = rows[0];
  return {
    distinctSessionCount: row?.distinctSessionCount ?? 0,
    max: row?.max ?? null,
    median: row?.median ?? null,
    min: row?.min ?? null,
    p90: row?.p90 ?? null,
  };
}

async function labelDistribution(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
  column: 'agent_type' | 'hook_event_name' | 'privacy_level',
  fallbackLabel: string,
): Promise<readonly LabelCount[]> {
  const { rows } = await client.query<LabelCount>(
    `SELECT COALESCE(e.${column}, '${fallbackLabel}') AS label, count(*)::int AS count
     FROM skill_usage_events e
     WHERE e.occurred_at >= $1 AND e.occurred_at < $2
       ${fixtureExclusionClause(probe)}
     GROUP BY 1
     ORDER BY count DESC, label ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function dailyInvocations(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly DailyInvocationCount[]> {
  const { rows } = await client.query<DailyInvocationCount>(
    `SELECT
       to_char(date_trunc('day', e.occurred_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
       count(*)::int AS count
     FROM skill_usage_events e
     WHERE e.occurred_at >= $1 AND e.occurred_at < $2
       ${fixtureExclusionClause(probe)}
     GROUP BY 1
     ORDER BY 1 ASC`,
    [window.since, window.until],
  );
  return rows;
}

/**
 * `metrics.skill_usage` — invocation counts per (skill_name, scope), the
 * distinct-session count and invocations-per-session spread, hook_event_name
 * / agent_type / privacy_level distributions, and a daily time series.
 * Excludes `is_fixture` rows (migration 125's bring-up probes) when the
 * column exists, matching the production Usage surface's own default.
 */
export const skillUsageMetricQuery: MetricQuery<SkillUsageMetrics> = {
  name: 'skill_usage',
  requires: {
    columns: {
      skill_usage_events: [
        'id',
        'skill_name',
        'scope',
        'session_id',
        'hook_event_name',
        'agent_type',
        'privacy_level',
        'occurred_at',
      ],
    },
    tables: ['skill_usage_events'],
  },
  async run({
    client,
    probe,
    window,
  }: MetricContext): Promise<SkillUsageMetrics> {
    const [
      totalInWindow,
      bySkill,
      sessionInvocationsResult,
      hookEventNames,
      agentTypes,
      privacyLevels,
      dailyInvocationsResult,
    ] = await Promise.all([
      countTotalInWindow(client, probe, window),
      countBySkillAndScope(client, probe, window),
      sessionInvocationStats(client, probe, window),
      labelDistribution(client, probe, window, 'hook_event_name', 'unknown'),
      labelDistribution(client, probe, window, 'agent_type', 'none'),
      labelDistribution(client, probe, window, 'privacy_level', 'unknown'),
      dailyInvocations(client, probe, window),
    ]);

    return {
      agentTypes,
      bySkill,
      dailyInvocations: dailyInvocationsResult,
      hookEventNames,
      privacyLevels,
      sessionInvocations: sessionInvocationsResult,
      totalInWindow,
    };
  },
};

async function outcomeMixOverall(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly LabelCount[]> {
  const { rows } = await client.query<LabelCount>(
    `SELECT o.outcome AS label, count(*)::int AS count
     FROM skill_usage_outcomes o
     WHERE o.occurred_at >= $1 AND o.occurred_at < $2
       ${reportedOnlyClause(probe)}
     GROUP BY 1
     ORDER BY count DESC, label ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function outcomeMixBySkill(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly SkillOutcomeMixRow[]> {
  const { rows } = await client.query<SkillOutcomeMixRow>(
    `SELECT o.skill_name AS "skillName", o.outcome AS outcome, count(*)::int AS count
     FROM skill_usage_outcomes o
     WHERE o.occurred_at >= $1 AND o.occurred_at < $2
       ${reportedOnlyClause(probe)}
     GROUP BY o.skill_name, o.outcome
     ORDER BY o.skill_name ASC, count DESC`,
    [window.since, window.until],
  );
  return rows;
}

async function durationsBySkill(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly SkillDurationStats[]> {
  const { rows } = await client.query<SkillDurationStats>(
    `SELECT
       o.skill_name AS "skillName",
       percentile_cont(0.5) WITHIN GROUP (ORDER BY o.duration_ms) AS "medianMs",
       percentile_cont(0.9) WITHIN GROUP (ORDER BY o.duration_ms) AS "p90Ms",
       percentile_cont(0.99) WITHIN GROUP (ORDER BY o.duration_ms) AS "p99Ms",
       count(*)::int AS "sampleCount"
     FROM skill_usage_outcomes o
     WHERE o.occurred_at >= $1 AND o.occurred_at < $2
       AND o.duration_ms IS NOT NULL
       ${reportedOnlyClause(probe)}
     GROUP BY o.skill_name
     ORDER BY o.skill_name ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function outcomesBySource(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<readonly LabelCount[] | null> {
  if (!probe.hasColumns('skill_usage_outcomes', ['source'])) {
    return null;
  }

  const { rows } = await client.query<LabelCount>(
    `SELECT COALESCE(o.source, 'unknown') AS label, count(*)::int AS count
     FROM skill_usage_outcomes o
     WHERE o.occurred_at >= $1 AND o.occurred_at < $2
       ${reportedOnlyClause(probe)}
     GROUP BY 1
     ORDER BY count DESC, label ASC`,
    [window.since, window.until],
  );
  return rows;
}

/**
 * Buckets every event in the window by the outcome evidence correlated to it:
 * a genuinely reported outcome, only a pre-fix `legacy_assumed_success` row, or
 * nothing at all. One pass, and the three counts sum to the window's event
 * total. See the module doc for the correlation rule.
 */
async function measureEventOutcomeCoverage(
  client: pg.Pool,
  probe: CapabilityProbe,
  window: ReportWindow,
): Promise<EventOutcomeCoverage> {
  const correlates = `(
    (e.tool_use_id IS NOT NULL AND o.tool_use_id = e.tool_use_id)
    OR (
      e.tool_use_id IS NULL
      AND o.tool_use_id IS NULL
      AND e.session_id IS NOT NULL
      AND o.session_id = e.session_id
      AND o.skill_name = e.skill_name
    )
  )`;

  const { rows } = await client.query<{
    legacyAssumedOnly: number;
    noOutcome: number;
    reported: number;
  }>(
    `SELECT
       count(*) FILTER (WHERE has_reported)::int AS "reported",
       count(*) FILTER (WHERE NOT has_reported AND has_any)::int AS "legacyAssumedOnly",
       count(*) FILTER (WHERE NOT has_any)::int AS "noOutcome"
     FROM (
       SELECT
         EXISTS (
           SELECT 1 FROM skill_usage_outcomes o
           WHERE ${correlates}
         ) AS has_any,
         EXISTS (
           SELECT 1 FROM skill_usage_outcomes o
           WHERE ${correlates} ${reportedOnlyClause(probe)}
         ) AS has_reported
       FROM skill_usage_events e
       WHERE e.occurred_at >= $1 AND e.occurred_at < $2
         ${fixtureExclusionClause(probe)}
     ) AS classified`,
    [window.since, window.until],
  );

  const row = rows[0];
  return {
    legacyAssumedOnly: row?.legacyAssumedOnly ?? 0,
    noOutcome: row?.noOutcome ?? 0,
    reported: row?.reported ?? 0,
  };
}

/**
 * `metrics.skill_usage_outcomes` — outcome mix per skill and overall,
 * duration percentiles per skill, the outcome `source` distribution (when
 * migration 112 has run), and the count of start events with no correlated
 * outcome row. Excludes `legacy_assumed_success` capture-model rows wholesale
 * when the column exists (migration 124), matching the production Usage
 * aggregation's own convention.
 */
export const skillUsageOutcomeMetricQuery: MetricQuery<SkillUsageOutcomeMetrics> =
  {
    name: 'skill_usage_outcomes',
    requires: {
      columns: {
        skill_usage_events: [
          'id',
          'skill_name',
          'session_id',
          'tool_use_id',
          'occurred_at',
        ],
        skill_usage_outcomes: [
          'id',
          'skill_name',
          'session_id',
          'tool_use_id',
          'outcome',
          'duration_ms',
          'occurred_at',
        ],
      },
      tables: ['skill_usage_events', 'skill_usage_outcomes'],
    },
    async run({
      client,
      probe,
      window,
    }: MetricContext): Promise<SkillUsageOutcomeMetrics> {
      const [
        outcomeMixOverallResult,
        outcomeMixBySkillResult,
        durationsBySkillResult,
        outcomesBySourceResult,
        eventOutcomeCoverage,
      ] = await Promise.all([
        outcomeMixOverall(client, probe, window),
        outcomeMixBySkill(client, probe, window),
        durationsBySkill(client, probe, window),
        outcomesBySource(client, probe, window),
        measureEventOutcomeCoverage(client, probe, window),
      ]);

      return {
        durationsBySkill: durationsBySkillResult,
        eventOutcomeCoverage,
        outcomeMixBySkill: outcomeMixBySkillResult,
        outcomeMixOverall: outcomeMixOverallResult,
        outcomesBySource: outcomesBySourceResult,
      };
    },
  };
