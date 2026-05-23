// FIXME: Swap out eventually

/**
 * @description Resolver for activity-by-date-range. Uses PlansService repository manager for raw SQL across commit_links, plan_output_stream, tasks.
 */

import { Plan, Task } from '@openthrottle/nestjs-repositories';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { TaskObject } from '../tasks/task.object';
import {
  ActivityByDateResultObject,
  ActivityCommitRowObject,
  ActivityOutputChunkRowObject,
  ActivityTaskUpdatedRowObject,
  LastActivityCommitPartObject,
  LastActivityOutputChunkPartObject,
  LastActivityResultObject,
  LastActivityTaskUpdatePartObject,
} from './activity.object';
import {
  ActivityByDateInput,
  ActivityByDateRangeInput,
  LastActivityInput,
} from './activity.input';

type ActivityRow =
  | ActivityCommitRowObject
  | ActivityOutputChunkRowObject
  | ActivityTaskUpdatedRowObject;

function getTimestamp(row: ActivityRow): Date {
  if ('createdAt' in row) return row.createdAt as Date;
  return (row as ActivityTaskUpdatedRowObject).updatedAt as Date;
}

@Resolver(() => ActivityCommitRowObject)
export class ActivityCommitRowResolver {
  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {}

  @ResolveField(() => Plan, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(@Parent() parent: ActivityCommitRowObject): Promise<Plan | null> {
    if (!parent.planId) return null;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: parent.planId } });

    return plan;
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  async task(@Parent() parent: ActivityCommitRowObject): Promise<Task | null> {
    if (!parent.taskId) return null;

    const result = await this.tasksService
      .getRepository()
      .findOne({ where: { id: parent.taskId } });

    return result;
  }
}

@Resolver(() => ActivityOutputChunkRowObject)
export class ActivityOutputChunkRowResolver {
  constructor(private readonly plansService: PlansService) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: ActivityOutputChunkRowObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: parent.planId } });

    return plan;
  }
}

@Resolver(() => ActivityTaskUpdatedRowObject)
export class ActivityTaskUpdatedRowResolver {
  constructor(
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: ActivityTaskUpdatedRowObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: parent.planId } });

    return plan;
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity (row id is the task id)`,
    nullable: true,
  })
  async task(
    @Parent() parent: ActivityTaskUpdatedRowObject,
  ): Promise<Task | null> {
    if (!parent.id) return null;

    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: parent.id } });

    return task;
  }
}

@Resolver()
export class ActivityResolver {
  constructor(private readonly plansService: PlansService) {}

  @Query(() => ActivityByDateResultObject, {
    description: `Activity for a single date (YYYY-MM-DD) or last N days. Provide exactly one of date or daysBack. Optional limit/offset for pagination.`,
  })
  async activityByDate(
    @Args('input', { type: () => ActivityByDateInput })
    input: ActivityByDateInput,
  ): Promise<ActivityByDateResultObject> {
    const { date, daysBack, limit, offset } = input;
    const hasDate = date != null && date !== '';
    const hasDaysBack = daysBack != null;

    if (hasDate === hasDaysBack) {
      throw new Error(
        'Provide exactly one of date (YYYY-MM-DD) or daysBack (1–365)',
      );
    }

    let startIso: string;
    let endIso: string;

    if (hasDate && date) {
      const ymd = date.split('-').map(Number);
      if (ymd.length !== 3) throw new Error('date must be YYYY-MM-DD');
      startIso = `${date}T00:00:00.000Z`;
      const next = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2] + 1));
      endIso = next.toISOString();
    } else if (hasDaysBack && daysBack != null) {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCDate(
        startDate.getUTCDate() - Math.min(365, Math.max(1, daysBack)),
      );
      startIso = startDate.toISOString();
      endIso = endDate.toISOString();
    } else {
      throw new Error('Provide exactly one of date or daysBack');
    }

    return this.fetchActivityByRange(
      startIso,
      endIso,
      limit ?? undefined,
      offset ?? undefined,
    );
  }

  @Query(() => ActivityByDateResultObject, {
    description: `Activity in a date range: commits, plan output chunks, tasks updated. Optional limit/offset for pagination.`,
  })
  async activityByDateRange(
    @Args('input', { type: () => ActivityByDateRangeInput })
    input: ActivityByDateRangeInput,
  ): Promise<ActivityByDateResultObject> {
    return this.fetchActivityByRange(
      input.startIso,
      input.endIso,
      input.limit ?? undefined,
      input.offset ?? undefined,
    );
  }

  @Query(() => LastActivityResultObject, {
    description: `Single most recent activity (commit, plan output chunk, or task update) for a plan or task. Use for "What was the last thing we did for <plan> or <task>?".`,
    nullable: true,
  })
  async lastActivity(
    @Args('input', { type: () => LastActivityInput })
    input: LastActivityInput,
  ): Promise<LastActivityResultObject | null> {
    const { planId, taskId } = input;
    const repo = this.plansService.getRepository();
    const q = repo.manager.query.bind(repo.manager);

    type Candidate = {
      at: string;
      commit?: { message: string | null; repo: string; sha: string };
      kind: 'commit' | 'output_chunk' | 'task_update';
      outputChunk?: { content: string; iteration: number | null };
      summary: string;
      taskUpdate?: { status: string; taskId: string; taskTitle: string };
    };
    const candidates: Candidate[] = [];

    if (taskId) {
      const commitRows = (await q(
        `SELECT created_at, repo, sha, message FROM commit_links WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [taskId],
      )) as {
        created_at: string;
        message: string | null;
        repo: string;
        sha: string;
      }[];
      const row = commitRows[0];
      if (row) {
        candidates.push({
          at: row.created_at,
          commit: {
            message: row.message,
            repo: row.repo,
            sha: row.sha,
          },
          kind: 'commit',
          summary: `Commit: ${row.message ?? row.sha} (${row.repo}@${row.sha.slice(0, 7)})`,
        });
      }
    } else {
      const commitRows = (await q(
        `SELECT created_at, repo, sha, message FROM commit_links WHERE plan_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [planId],
      )) as {
        created_at: string;
        message: string | null;
        repo: string;
        sha: string;
      }[];
      const row = commitRows[0];
      if (row) {
        candidates.push({
          at: row.created_at,
          commit: {
            message: row.message,
            repo: row.repo,
            sha: row.sha,
          },
          kind: 'commit',
          summary: `Commit: ${row.message ?? row.sha} (${row.repo}@${row.sha.slice(0, 7)})`,
        });
      }
    }

    const outputRows = (await q(
      `SELECT content, created_at, iteration FROM plan_output_stream WHERE plan_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [planId],
    )) as { content: string; created_at: string; iteration: number | null }[];
    const outRow = outputRows[0];
    if (outRow) {
      const preview =
        outRow.content.slice(0, 120) + (outRow.content.length > 120 ? '…' : '');
      candidates.push({
        at: outRow.created_at,
        kind: 'output_chunk',
        outputChunk: {
          content: outRow.content,
          iteration: outRow.iteration,
        },
        summary: `Plan output: ${preview}`,
      });
    }

    if (taskId) {
      const taskRows = (await q(
        `SELECT title, status, updated_at FROM tasks WHERE id = $1`,
        [taskId],
      )) as { status: string; title: string; updated_at: string }[];
      const tRow = taskRows[0];
      if (tRow) {
        candidates.push({
          at: tRow.updated_at,
          kind: 'task_update',
          summary: `Task "${tRow.title}" updated to status ${tRow.status}`,
          taskUpdate: {
            status: tRow.status,
            taskId,
            taskTitle: tRow.title,
          },
        });
      }
    } else {
      const taskRows = (await q(
        `SELECT id, title, status, updated_at FROM tasks WHERE plan_id = $1 ORDER BY updated_at DESC LIMIT 1`,
        [planId],
      )) as { id: string; status: string; title: string; updated_at: string }[];
      const tRow = taskRows[0];
      if (tRow) {
        candidates.push({
          at: tRow.updated_at,
          kind: 'task_update',
          summary: `Task "${tRow.title}" updated to status ${tRow.status}`,
          taskUpdate: {
            status: tRow.status,
            taskId: tRow.id,
            taskTitle: tRow.title,
          },
        });
      }
    }

    if (candidates.length === 0) return null;
    const latest = candidates.reduce((a, b) => (a.at > b.at ? a : b));

    const result = new LastActivityResultObject();
    result.at = new Date(latest.at);
    result.kind = latest.kind;
    result.planId = planId;
    result.taskId = taskId ?? null;
    result.summary = latest.summary;
    result.commit = latest.commit
      ? Object.assign(new LastActivityCommitPartObject(), latest.commit)
      : null;
    result.outputChunk = latest.outputChunk
      ? Object.assign(
          new LastActivityOutputChunkPartObject(),
          latest.outputChunk,
        )
      : null;
    result.taskUpdate = latest.taskUpdate
      ? Object.assign(new LastActivityTaskUpdatePartObject(), latest.taskUpdate)
      : null;
    return result;
  }

  private async fetchActivityByRange(
    startIso: string,
    endIso: string,
    limit?: number,
    offset?: number,
  ): Promise<ActivityByDateResultObject> {
    const repo = this.plansService.getRepository();
    const q = repo.manager.query.bind(repo.manager);

    const [commitRows, outputRows, taskRows] = await Promise.all([
      q(
        `SELECT cl.id, cl.plan_id, cl.task_id, cl.repo, cl.sha, cl.message, cl.created_at,
                p.title AS plan_title, t.title AS task_title
         FROM commit_links cl
         JOIN plans p ON cl.plan_id = p.id
         LEFT JOIN tasks t ON cl.task_id = t.id
         WHERE cl.created_at >= $1::timestamptz AND cl.created_at < $2::timestamptz
         ORDER BY cl.created_at DESC`,
        [startIso, endIso],
      ) as Promise<
        {
          created_at: string;
          id: string;
          message: string | null;
          plan_id: string;
          plan_title: string;
          repo: string;
          sha: string;
          task_id: string | null;
          task_title: string | null;
        }[]
      >,
      q(
        `SELECT pos.id, pos.plan_id, pos.iteration, pos.content, pos.created_at, p.title AS plan_title
         FROM plan_output_stream pos
         JOIN plans p ON pos.plan_id = p.id
         WHERE pos.created_at >= $1::timestamptz AND pos.created_at < $2::timestamptz
         ORDER BY pos.created_at ASC`,
        [startIso, endIso],
      ) as Promise<
        {
          content: string;
          created_at: string;
          id: string;
          iteration: number | null;
          plan_id: string;
          plan_title: string;
        }[]
      >,
      q(
        `SELECT t.id, t.plan_id, t.title, t.status, t.updated_at, p.title AS plan_title
         FROM tasks t
         JOIN plans p ON t.plan_id = p.id
         WHERE t.updated_at >= $1::timestamptz AND t.updated_at < $2::timestamptz
         ORDER BY t.updated_at DESC`,
        [startIso, endIso],
      ) as Promise<
        {
          id: string;
          plan_id: string;
          plan_title: string;
          status: string;
          title: string;
          updated_at: string;
        }[]
      >,
    ]);

    const commits = commitRows.map((r) => {
      const obj = new ActivityCommitRowObject();
      obj.createdAt = new Date(r.created_at);
      obj.id = r.id;
      obj.message = r.message;
      obj.plan = null;
      obj.planId = r.plan_id;
      obj.planTitle = r.plan_title;
      obj.repo = r.repo;
      obj.sha = r.sha;
      obj.task = null;
      obj.taskId = r.task_id;
      obj.taskTitle = r.task_title;
      return obj;
    });
    const outputChunks = outputRows.map((r) => {
      const obj = new ActivityOutputChunkRowObject();
      obj.content = r.content;
      obj.createdAt = new Date(r.created_at);
      obj.id = r.id;
      obj.iteration = r.iteration;
      obj.plan = null;
      obj.planId = r.plan_id;
      obj.planTitle = r.plan_title;
      return obj;
    });
    const tasksUpdated = taskRows.map((r) => {
      const obj = new ActivityTaskUpdatedRowObject();
      obj.id = r.id;
      obj.plan = null;
      obj.planId = r.plan_id;
      obj.planTitle = r.plan_title;
      obj.status = r.status;
      obj.task = null;
      obj.title = r.title;
      obj.updatedAt = new Date(r.updated_at);
      return obj;
    });

    type MergedItem =
      | { kind: 'commit'; row: ActivityCommitRowObject }
      | { kind: 'outputChunk'; row: ActivityOutputChunkRowObject }
      | { kind: 'taskUpdated'; row: ActivityTaskUpdatedRowObject };

    const merged: MergedItem[] = [
      ...commits.map((row) => ({ kind: 'commit' as const, row })),
      ...outputChunks.map((row) => ({ kind: 'outputChunk' as const, row })),
      ...tasksUpdated.map((row) => ({ kind: 'taskUpdated' as const, row })),
    ];
    merged.sort(
      (a, b) => getTimestamp(b.row).getTime() - getTimestamp(a.row).getTime(),
    );

    const totalCount = merged.length;
    const usePagination = limit != null && limit > 0;
    const effectiveLimit = usePagination ? Math.min(limit, 500) : totalCount;
    const effectiveOffset = usePagination ? Math.max(0, offset ?? 0) : 0;
    const slice = merged.slice(
      effectiveOffset,
      effectiveOffset + effectiveLimit,
    );
    const hasNext =
      usePagination && effectiveOffset + effectiveLimit < totalCount;

    const result = new ActivityByDateResultObject();

    result.commits = slice
      .filter((s): s is MergedItem & { kind: 'commit' } => s.kind === 'commit')
      .map((s) => s.row);
    result.hasNext = hasNext;
    result.outputChunks = slice
      .filter(
        (s): s is MergedItem & { kind: 'outputChunk' } =>
          s.kind === 'outputChunk',
      )
      .map((s) => s.row);
    result.tasksUpdated = slice
      .filter(
        (s): s is MergedItem & { kind: 'taskUpdated' } =>
          s.kind === 'taskUpdated',
      )
      .map((s) => s.row);
    result.totalCount = totalCount;

    return result;
  }
}
