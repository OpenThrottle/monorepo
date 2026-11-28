import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { QueryFailedError, Repository } from 'typeorm';

import { EVAL_LABEL_VERDICT } from '../eval-human-labels/eval-human-labels.constants.ts';
import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';
import type { AgentTrajectoryScoreStateValue } from './agent-trajectories.constants.ts';
import {
  AGENT_TRAJECTORY_SCORE_STATE,
  AGENT_TRAJECTORY_SOURCE,
} from './agent-trajectories.constants.ts';
import type {
  AgentTrajectoryPlanGroup,
  AgentTrajectoryPlanGroupItem,
  AgentTrajectorySource,
  CreateAgentTrajectoryInput,
  FindAgentTrajectoryPlanGroupsParams,
  FindAgentTrajectoryPlanGroupsResult,
  ReplaceAgentTrajectoryInput,
} from './agent-trajectories.types.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

const UNIQUE_VIOLATION = '23505';
const IDEMPOTENCY_KEY_INDEX = 'uq_agent_trajectories_idempotency_key';

/**
 * Group key for trajectories whose plan was deleted: they share one "unknown plan" group, keyed by
 * the nil UUID so it sorts and paginates like any other group.
 */
const UNKNOWN_PLAN_GROUP_KEY = '00000000-0000-0000-0000-000000000000';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The per-trajectory predicate each score state applies, over the `scoped` CTE's `verdict` (the
 * caller's own label). Constant SQL fragments, never built from input.
 */
const SCORE_STATE_PREDICATE: Readonly<
  Record<AgentTrajectoryScoreStateValue, string>
> = {
  [AGENT_TRAJECTORY_SCORE_STATE.ALL]: 'TRUE',
  [AGENT_TRAJECTORY_SCORE_STATE.SCORED]: 'scoped.verdict IS NOT NULL',
  [AGENT_TRAJECTORY_SCORE_STATE.UNSCORED]: 'scoped.verdict IS NULL',
};

/**
 * Every trajectory visible to the listing, with its group key (the live plan's id, or the nil UUID
 * for a deleted plan) and the caller's verdict. `$1` is the rater, `$2` the repository filter and
 * `$3` the plan filter.
 */
const SCOPED_TRAJECTORIES_CTE = `scoped AS (
  SELECT at.id, at.task_id, at.plan_run_id, at.source, at.truncated, at.cost_usd,
         at.input_tokens, at.output_tokens, at.cached_tokens, at.duration_ms, at.created_at,
         CASE WHEN p.deleted_at IS NULL THEN p.id END AS plan_id,
         CASE WHEN p.deleted_at IS NULL THEN p.id ELSE '${UNKNOWN_PLAN_GROUP_KEY}'::uuid END AS group_key,
         mine.verdict AS verdict,
         EXISTS (
           SELECT 1 FROM eval_human_labels anyone
            WHERE anyone.trajectory_id = at.id AND anyone.deleted_at IS NULL
         ) AS labelled
    FROM agent_trajectories at
    JOIN plan_runs pr ON pr.id = at.plan_run_id
    JOIN plans p ON p.id = pr.plan_id
    LEFT JOIN eval_human_labels mine
      ON mine.trajectory_id = at.id AND mine.rater = $1::text AND mine.deleted_at IS NULL
   WHERE ($2::uuid IS NULL OR p.repository_id = $2::uuid)
     AND ($3::uuid IS NULL OR p.id = $3::uuid)
)`;

interface PlanGroupCursor {
  readonly groupKey: string;
  readonly latestRecordedAt: string;
}

interface PlanGroupRow {
  readonly fail_count: number;
  readonly group_key: string;
  readonly labelled_count: number;
  readonly latest_cursor: string;
  readonly latest_recorded_at: Date;
  readonly pass_count: number;
  readonly plan_id: string | null;
  readonly plan_status: string | null;
  readonly plan_title: string | null;
  readonly scored_count: number;
  readonly trajectory_count: number;
}

interface PlanGroupItemRow {
  readonly cached_tokens: number | null;
  readonly cost_usd: number | string | null;
  readonly created_at: Date;
  readonly duration_ms: number | null;
  readonly group_key: string;
  readonly id: string;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly plan_run_id: string;
  readonly source: string;
  readonly task_id: string | null;
  readonly task_title: string | null;
  readonly truncated: boolean;
  readonly verdict: string | null;
}

const encodePlanGroupCursor = (cursor: PlanGroupCursor): string => {
  return Buffer.from(
    JSON.stringify([cursor.latestRecordedAt, cursor.groupKey]),
  ).toString('base64url');
};

const decodePlanGroupCursor = (value: string): PlanGroupCursor | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== 2) return null;

  const [latestRecordedAt, groupKey]: unknown[] = parsed;

  if (
    typeof latestRecordedAt !== 'string' ||
    Number.isNaN(Date.parse(latestRecordedAt)) ||
    typeof groupKey !== 'string' ||
    !UUID_PATTERN.test(groupKey)
  ) {
    return null;
  }

  return { groupKey, latestRecordedAt };
};

const toTrajectorySource = (value: string): AgentTrajectorySource => {
  return value === AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD
    ? AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD
    : AGENT_TRAJECTORY_SOURCE.SPAWNED;
};

const toVerdict = (value: string | null): EvalLabelVerdict | null => {
  if (value === EVAL_LABEL_VERDICT.pass) return EVAL_LABEL_VERDICT.pass;
  if (value === EVAL_LABEL_VERDICT.fail) return EVAL_LABEL_VERDICT.fail;

  return null;
};

const toPlanGroupItem = (
  row: PlanGroupItemRow,
): AgentTrajectoryPlanGroupItem => {
  return {
    cachedTokens: row.cached_tokens,
    costUsd: row.cost_usd == null ? null : Number(row.cost_usd),
    durationMs: row.duration_ms,
    id: row.id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    planRunId: row.plan_run_id,
    recordedAt: row.created_at,
    source: toTrajectorySource(row.source),
    taskId: row.task_id,
    taskTitle: row.task_title,
    truncated: row.truncated,
    verdict: toVerdict(row.verdict),
  };
};

const isIdempotencyKeyConflict = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === UNIQUE_VIOLATION &&
    'constraint' in driverError &&
    driverError.constraint === IDEMPOTENCY_KEY_INDEX
  );
};

/**
 * @description Data access for the openthrottle `agent_trajectories` table on the default
 * connection: the `BaseRepository` CRUD plus the idempotent record, the in-place replace and the
 * plan-run and task listings. A trajectory is a recorded result, so a delete is a hard delete and
 * only an FK cascade does it. The old service's nullable `findById` is
 * {@link AgentTrajectoriesRepository.findTrajectoryById}: the inherited `findById` throws
 * `NotFoundException` on a miss.
 * @public
 */
@Injectable()
export class AgentTrajectoriesRepository extends BaseRepository<
  AgentTrajectory,
  CreateModelInput<AgentTrajectory>
> {
  protected readonly tableName = 'agent_trajectories';

  constructor(
    @InjectRepository(AgentTrajectory)
    repository: Repository<AgentTrajectory>,
  ) {
    super(repository);
  }

  /**
   * @description Records one trajectory. The caller owns capture's fail-open policy: this method
   * rejects on a database error and the capture site decides to log and continue.
   *
   * With an `idempotencyKey`, a duplicate is a successful no-op that returns the stored row. The
   * partial unique index is the arbiter, so two concurrent inserts cannot both land: the loser's
   * 23505 on that index is caught and the winner's row is read back.
   */
  async createTrajectory(
    input: CreateAgentTrajectoryInput,
  ): Promise<AgentTrajectory> {
    const { idempotencyKey } = input;

    if (idempotencyKey != null) {
      const existing = await this.findByIdempotencyKey(idempotencyKey);

      if (existing !== null) return existing;
    }

    try {
      return await this.create(input);
    } catch (error) {
      if (idempotencyKey != null && isIdempotencyKeyConflict(error)) {
        const winner = await this.findByIdempotencyKey(idempotencyKey);

        if (winner !== null) return winner;
      }

      throw error;
    }
  }

  /**
   * @description Returns the trajectory recorded under an idempotency key, or null.
   */
  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<AgentTrajectory | null> {
    return this.findOne({ where: { idempotencyKey } });
  }

  /**
   * @description Returns one trajectory by id, or null when it does not exist.
   */
  async findTrajectoryById(id: string): Promise<AgentTrajectory | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Replaces the document (and derived summary columns) on an existing trajectory,
   * keeping its id so labels keyed by trajectory id survive. Returns null when no row matches.
   * A concurrent idempotency-key conflict is rethrown for the caller to surface.
   */
  async replaceTrajectory(
    id: string,
    input: ReplaceAgentTrajectoryInput,
  ): Promise<AgentTrajectory | null> {
    const existing = await this.findTrajectoryById(id);

    if (existing === null) {
      return null;
    }

    existing.byteSize = input.byteSize;
    existing.cachedTokens = input.cachedTokens;
    existing.costUsd = input.costUsd;
    existing.durationMs = input.durationMs;
    existing.exitCode = input.exitCode;
    existing.idempotencyKey = input.idempotencyKey;
    existing.incomplete = input.incomplete;
    existing.inputTokens = input.inputTokens;
    existing.model = input.model;
    existing.outcome = input.outcome;
    existing.outputTokens = input.outputTokens;
    existing.planRunId = input.planRunId;
    existing.schemaVersion = input.schemaVersion;
    existing.toolCallCount = input.toolCallCount;
    existing.trajectory = input.trajectory;
    existing.truncated = input.truncated;

    return this.repository.save(existing);
  }

  /**
   * @description Lists a plan run's trajectories, oldest first.
   */
  async findByPlanRun(planRunId: string): Promise<AgentTrajectory[]> {
    return this.findBy({ order: { createdAt: 'ASC' }, where: { planRunId } });
  }

  /**
   * @description Lists a task's trajectories, oldest first.
   */
  async findByTask(taskId: string): Promise<AgentTrajectory[]> {
    return this.findBy({ order: { createdAt: 'ASC' }, where: { taskId } });
  }

  /**
   * @description Lists trajectories grouped by their plan, newest activity (latest recording)
   * first, cursor-paginated by group. Two queries whatever the page size: one aggregates the
   * page's groups, one reads their trajectories. A group is listed only when the score-state
   * filter keeps at least one of its trajectories; its counts still cover all of them. Inside a
   * group, plan-scoped trajectories come first, then task order, then recording order.
   * Trajectories of deleted plans share one group whose plan fields are null.
   */
  async findPlanGroups(
    params: FindAgentTrajectoryPlanGroupsParams,
  ): Promise<FindAgentTrajectoryPlanGroupsResult> {
    const cursor =
      params.after == null ? null : decodePlanGroupCursor(params.after);

    if (params.after != null && cursor === null) {
      return { kind: 'invalid-cursor' };
    }

    const predicate = SCORE_STATE_PREDICATE[params.scoreState];
    const groupRows: PlanGroupRow[] = await this.repository.query(
      `WITH ${SCOPED_TRAJECTORIES_CTE},
       grouped AS (
         SELECT scoped.group_key,
                MAX(scoped.plan_id::text)::uuid AS plan_id,
                COUNT(*)::int AS trajectory_count,
                COUNT(scoped.verdict)::int AS scored_count,
                (COUNT(*) FILTER (WHERE scoped.labelled))::int AS labelled_count,
                (COUNT(*) FILTER (WHERE scoped.verdict = '${EVAL_LABEL_VERDICT.pass}'))::int AS pass_count,
                (COUNT(*) FILTER (WHERE scoped.verdict = '${EVAL_LABEL_VERDICT.fail}'))::int AS fail_count,
                (COUNT(*) FILTER (WHERE ${predicate}))::int AS matching_count,
                MAX(scoped.created_at) AS latest_recorded_at
           FROM scoped
          GROUP BY scoped.group_key
       )
       SELECT grouped.*, grouped.latest_recorded_at::text AS latest_cursor,
              p.title AS plan_title, p.status AS plan_status
         FROM grouped
         LEFT JOIN plans p ON p.id = grouped.plan_id
        WHERE grouped.matching_count > 0
          AND ($4::timestamptz IS NULL
               OR (grouped.latest_recorded_at, grouped.group_key) < ($4::timestamptz, $5::uuid))
        ORDER BY grouped.latest_recorded_at DESC, grouped.group_key DESC
        LIMIT $6`,
      [
        params.rater,
        params.repositoryId,
        params.planId,
        cursor?.latestRecordedAt ?? null,
        cursor?.groupKey ?? null,
        params.first + 1,
      ],
    );

    const hasNextPage = groupRows.length > params.first;
    const pageRows = groupRows.slice(0, params.first);
    const lastRow = pageRows[pageRows.length - 1];

    if (lastRow === undefined) {
      return {
        kind: 'page',
        page: { endCursor: null, groups: [], hasNextPage: false },
      };
    }

    const itemRows: PlanGroupItemRow[] = await this.repository.query(
      `WITH ${SCOPED_TRAJECTORIES_CTE}
       SELECT scoped.*, t.title AS task_title
         FROM scoped
         LEFT JOIN tasks t ON t.id = scoped.task_id
        WHERE scoped.group_key = ANY($4::uuid[]) AND ${predicate}
        ORDER BY t.sort_order ASC NULLS FIRST, scoped.created_at ASC, scoped.id ASC`,
      [
        params.rater,
        params.repositoryId,
        params.planId,
        pageRows.map((row) => row.group_key),
      ],
    );

    const itemsByGroup = new Map<string, AgentTrajectoryPlanGroupItem[]>();

    for (const row of itemRows) {
      const items = itemsByGroup.get(row.group_key) ?? [];

      items.push(toPlanGroupItem(row));
      itemsByGroup.set(row.group_key, items);
    }

    const groups = pageRows.map((row): AgentTrajectoryPlanGroup => {
      return {
        failCount: row.fail_count,
        labelledCount: row.labelled_count,
        latestRecordedAt: row.latest_recorded_at,
        passCount: row.pass_count,
        planId: row.plan_id,
        planStatus: row.plan_status,
        planTitle: row.plan_title,
        scoredCount: row.scored_count,
        trajectories: itemsByGroup.get(row.group_key) ?? [],
        trajectoryCount: row.trajectory_count,
      };
    });

    return {
      kind: 'page',
      page: {
        endCursor: encodePlanGroupCursor({
          groupKey: lastRow.group_key,
          latestRecordedAt: lastRow.latest_cursor,
        }),
        groups,
        hasNextPage,
      },
    };
  }
}
