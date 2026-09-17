import type pg from 'pg';

import type { LabelCount } from './count-types.ts';
import type { ReportWindow } from './envelope.ts';
import type { MetricContext, MetricQuery } from './metric-registry.ts';

/**
 * @description Agent-run metric families — `metrics.plan_runs` (Ralph queue
 * runs), `metrics.work_sessions` (the work-ledger spine), `metrics.
 * agent_conversations` (chat threads), and `metrics.scheduled_agent_jobs`
 * (cron-scheduled agent jobs) — registered as four separate {@link
 * MetricQuery}s so a database missing one family's table(s) still gets the
 * rest. Every query here selects counts, labels, statuses, or durations only —
 * NEVER `agent_conversations.title`, `work_sessions.summary`, or any
 * `external_ref` column, per the task's privacy requirement.
 */

/** Invocation count for one `(execution_backend, run_kind, status)` triple. */
export interface PlanRunGroupRow {
  readonly count: number;
  readonly executionBackend: string;
  readonly runKind: string;
  readonly status: string;
}

/** COMPLETED share of runs for one `execution_backend`, over the window. */
export interface PlanRunSuccessRateRow {
  readonly executionBackend: string;
  readonly successRate: number | null;
  readonly totalCount: number;
}

/** Runs-per-plan spread, over every plan (a plan with zero runs counts as 0). Unwindowed, like `tasksPerPlan`. */
export interface RunsPerPlanStats {
  readonly max: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly p90: number | null;
  readonly planCount: number;
}

export interface PlanRunsMetrics {
  readonly byBackendKindStatus: readonly PlanRunGroupRow[];
  readonly runsPerPlan: RunsPerPlanStats;
  readonly successRateByBackend: readonly PlanRunSuccessRateRow[];
  readonly totalInWindow: number;
}

async function queryPlanRunGroups(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly PlanRunGroupRow[]> {
  const { rows } = await client.query<PlanRunGroupRow>(
    `SELECT execution_backend AS "executionBackend", run_kind AS "runKind",
            status, count(*)::int AS count
     FROM plan_runs
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY execution_backend, run_kind, status
     ORDER BY execution_backend ASC, run_kind ASC, status ASC`,
    [window.since, window.until],
  );
  return rows;
}

/** COMPLETED is the only success status `register_plan_run`/`settle_plan_run` write; see plan-runs.ts. */
async function querySuccessRateByBackend(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly PlanRunSuccessRateRow[]> {
  const { rows } = await client.query<{
    completedCount: number;
    executionBackend: string;
    totalCount: number;
  }>(
    `SELECT execution_backend AS "executionBackend",
            count(*)::int AS "totalCount",
            count(*) FILTER (WHERE status = 'COMPLETED')::int AS "completedCount"
     FROM plan_runs
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY execution_backend
     ORDER BY execution_backend ASC`,
    [window.since, window.until],
  );
  return rows.map((row) => ({
    executionBackend: row.executionBackend,
    successRate:
      row.totalCount > 0 ? row.completedCount / row.totalCount : null,
    totalCount: row.totalCount,
  }));
}

async function queryRunsPerPlan(client: pg.Pool): Promise<RunsPerPlanStats> {
  const { rows } = await client.query<{
    max: number | null;
    median: number | null;
    min: number | null;
    p90: number | null;
    planCount: number;
  }>(
    `WITH counts AS (
       SELECT p.id, count(r.id)::int AS run_count
       FROM plans p
       LEFT JOIN plan_runs r ON r.plan_id = p.id
       GROUP BY p.id
     )
     SELECT
       min(run_count)::int AS min,
       max(run_count)::int AS max,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY run_count) AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY run_count) AS p90,
       count(*)::int AS "planCount"
     FROM counts`,
  );

  const row = rows[0];
  return {
    max: row?.max ?? null,
    median: row?.median ?? null,
    min: row?.min ?? null,
    p90: row?.p90 ?? null,
    planCount: row?.planCount ?? 0,
  };
}

/**
 * `metrics.plan_runs` — the Ralph-usage number: runs grouped by execution
 * backend/run kind/status, a per-backend success rate (share of runs whose
 * status is `COMPLETED`), and the runs-per-plan distribution.
 */
export const planRunsMetricQuery: MetricQuery<PlanRunsMetrics> = {
  name: 'plan_runs',
  requires: {
    columns: {
      plan_runs: [
        'id',
        'plan_id',
        'execution_backend',
        'run_kind',
        'status',
        'created_at',
      ],
      plans: ['id'],
    },
    tables: ['plan_runs', 'plans'],
  },
  async run({ client, window }: MetricContext): Promise<PlanRunsMetrics> {
    const [byBackendKindStatus, successRateByBackend, runsPerPlan] =
      await Promise.all([
        queryPlanRunGroups(client, window),
        querySuccessRateByBackend(client, window),
        queryRunsPerPlan(client),
      ]);

    return {
      byBackendKindStatus,
      runsPerPlan,
      successRateByBackend,
      totalInWindow: byBackendKindStatus.reduce(
        (sum, row) => sum + row.count,
        0,
      ),
    };
  },
};

/** Session count, median duration, and sweeper-closed share for one `(tool_name, tool_version, model)` triple. */
export interface WorkSessionGroupRow {
  readonly medianDurationSeconds: number | null;
  readonly model: string | null;
  readonly sessionCount: number;
  /** Share of CLOSED sessions in this group ended by the sweeper rather than explicitly; `null` when none are closed yet. */
  readonly sweeperClosedShare: number | null;
  readonly toolName: string;
  readonly toolVersion: string | null;
}

export interface WorkSessionsMetrics {
  readonly byToolVersionModel: readonly WorkSessionGroupRow[];
  readonly totalInWindow: number;
}

async function queryWorkSessionGroups(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly WorkSessionGroupRow[]> {
  const { rows } = await client.query<WorkSessionGroupRow>(
    `SELECT
       tool_name AS "toolName",
       tool_version AS "toolVersion",
       model,
       count(*)::int AS "sessionCount",
       percentile_cont(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (ended_at - started_at))
       ) FILTER (WHERE ended_at IS NOT NULL) AS "medianDurationSeconds",
       (count(*) FILTER (WHERE closed_by = 'sweeper'))::float8
         / NULLIF(count(*) FILTER (WHERE closed_by IS NOT NULL), 0) AS "sweeperClosedShare"
     FROM work_sessions
     WHERE started_at >= $1 AND started_at < $2
     GROUP BY tool_name, tool_version, model
     ORDER BY "sessionCount" DESC, tool_name ASC,
              tool_version ASC NULLS LAST, model ASC NULLS LAST`,
    [window.since, window.until],
  );
  return rows;
}

/**
 * `metrics.work_sessions` — session count, median started_at→ended_at
 * duration, and the sweeper-closed (abandoned) share, grouped by tool_name,
 * tool_version, and model. Never selects `summary` or `external_ref`.
 */
export const workSessionsMetricQuery: MetricQuery<WorkSessionsMetrics> = {
  name: 'work_sessions',
  requires: {
    columns: {
      work_sessions: [
        'id',
        'tool_name',
        'tool_version',
        'model',
        'started_at',
        'ended_at',
        'closed_by',
      ],
    },
    tables: ['work_sessions'],
  },
  async run({ client, window }: MetricContext): Promise<WorkSessionsMetrics> {
    const byToolVersionModel = await queryWorkSessionGroups(client, window);
    return {
      byToolVersionModel,
      totalInWindow: byToolVersionModel.reduce(
        (sum, row) => sum + row.sessionCount,
        0,
      ),
    };
  },
};

/** Messages-per-conversation spread, over conversations created in the window. */
export interface MessagesPerConversationStats {
  readonly max: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly p90: number | null;
}

export interface AgentConversationsMetrics {
  readonly conversationCountInWindow: number;
  readonly messagesPerConversation: MessagesPerConversationStats;
}

async function queryMessagesPerConversation(
  client: pg.Pool,
  window: ReportWindow,
): Promise<{
  readonly conversationCount: number;
  readonly stats: MessagesPerConversationStats;
}> {
  const { rows } = await client.query<{
    conversationCount: number;
    max: number | null;
    median: number | null;
    min: number | null;
    p90: number | null;
  }>(
    `WITH counts AS (
       SELECT c.id, count(m.id)::int AS message_count
       FROM agent_conversations c
       LEFT JOIN agent_conversation_messages m ON m.conversation_id = c.id
       WHERE c.created_at >= $1 AND c.created_at < $2
       GROUP BY c.id
     )
     SELECT
       count(*)::int AS "conversationCount",
       min(message_count)::int AS min,
       max(message_count)::int AS max,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY message_count) AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY message_count) AS p90
     FROM counts`,
    [window.since, window.until],
  );

  const row = rows[0];
  return {
    conversationCount: row?.conversationCount ?? 0,
    stats: {
      max: row?.max ?? null,
      median: row?.median ?? null,
      min: row?.min ?? null,
      p90: row?.p90 ?? null,
    },
  };
}

/**
 * `metrics.agent_conversations` — conversation count and messages-per-
 * conversation spread, over conversations created in the window. Never
 * selects `title` (`agent_conversations`) or `content` (`agent_conversation_
 * messages`).
 */
export const agentConversationsMetricQuery: MetricQuery<AgentConversationsMetrics> =
  {
    name: 'agent_conversations',
    requires: {
      columns: {
        agent_conversation_messages: ['id', 'conversation_id'],
        agent_conversations: ['id', 'created_at'],
      },
      tables: ['agent_conversations', 'agent_conversation_messages'],
    },
    async run({
      client,
      window,
    }: MetricContext): Promise<AgentConversationsMetrics> {
      const { conversationCount, stats } = await queryMessagesPerConversation(
        client,
        window,
      );
      return {
        conversationCountInWindow: conversationCount,
        messagesPerConversation: stats,
      };
    },
  };

export interface ScheduledAgentJobsMetrics {
  readonly activeJobCount: number;
  readonly runStatusMix: readonly LabelCount[];
  readonly runsInWindow: number;
}

async function queryActiveJobCount(client: pg.Pool): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM scheduled_agent_jobs WHERE enabled = TRUE`,
  );
  return rows[0]?.count ?? 0;
}

async function queryRunStatusMix(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly LabelCount[]> {
  const { rows } = await client.query<LabelCount>(
    `SELECT status AS label, count(*)::int AS count
     FROM scheduled_agent_job_runs
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY status
     ORDER BY count DESC, label ASC`,
    [window.since, window.until],
  );
  return rows;
}

/**
 * `metrics.scheduled_agent_jobs` — how many jobs are currently enabled
 * (`scheduled_agent_jobs`, unwindowed snapshot) and the run status mix for
 * runs created in the window (`scheduled_agent_job_runs`). Never selects
 * `name` or `prompt`.
 */
export const scheduledAgentJobsMetricQuery: MetricQuery<ScheduledAgentJobsMetrics> =
  {
    name: 'scheduled_agent_jobs',
    requires: {
      columns: {
        scheduled_agent_job_runs: [
          'id',
          'scheduled_agent_job_id',
          'status',
          'created_at',
        ],
        scheduled_agent_jobs: ['id', 'enabled'],
      },
      tables: ['scheduled_agent_jobs', 'scheduled_agent_job_runs'],
    },
    async run({
      client,
      window,
    }: MetricContext): Promise<ScheduledAgentJobsMetrics> {
      const [activeJobCount, runStatusMix] = await Promise.all([
        queryActiveJobCount(client),
        queryRunStatusMix(client, window),
      ]);

      return {
        activeJobCount,
        runStatusMix,
        runsInWindow: runStatusMix.reduce((sum, row) => sum + row.count, 0),
      };
    },
  };
