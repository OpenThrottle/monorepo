import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { TAG_ACTION_TYPES } from '@openthrottle/openthrottle-skills';
import { In, QueryFailedError, Repository } from 'typeorm';

import {
  TASK_STATUS,
  TASK_STATUS_VALUES,
} from '../../plan-task-status/plan-task-status.constants.ts';
import type { TaskStatus } from '../../plan-task-status/plan-task-status.types.ts';
import { Task } from '../tasks/task.entity.ts';
import { RuleApplication } from './rule-application.entity.ts';
import {
  RULE_APPLICATION_STATES,
  SOFT_CLOSED_TASK_STATUS,
} from './rule-applications.constants.ts';
import type {
  EdgePlacementSibling,
  OrphanedTaskStatusCapture,
  RecordRuleApplicationInput,
} from './rule-applications.types.ts';

/**
 * Terminal task statuses left untouched by the orphan soft-close.
 *
 * Exhaustive over {@link TaskStatus}: adding a status fails typecheck here until
 * someone decides whether it is terminal.
 */
const IS_TERMINAL_TASK_STATUS: Record<TaskStatus, boolean> = {
  [TASK_STATUS.BACKLOG]: false,
  [TASK_STATUS.BLOCKED]: false,
  [TASK_STATUS.CANCELED]: true,
  [TASK_STATUS.COMPLETED]: true,
  [TASK_STATUS.IN_PROGRESS]: false,
  [TASK_STATUS.PENDING]: false,
  [TASK_STATUS.PROMOTED]: true,
  [TASK_STATUS.SKIPPED]: true,
};

const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
};

/**
 * @description Data access for the openthrottle `rule_applications` apply-once ledger on the
 * default connection. UNIQUE (rule_id, plan_id) is the idempotency fingerprint: `record` treats
 * a unique-violation race as "the other writer won" and returns the existing row, so
 * at-least-once BullMQ redelivery and concurrent evaluation are safe. States only ever move
 * forward (applied to orphaned); actions are never undone. A ledger row is hard deleted (with
 * its plan), and reads that matter only for live rules join a live rule.
 * @public
 */
@Injectable()
export class RuleApplicationsRepository extends BaseRepository<
  RuleApplication,
  CreateModelInput<RuleApplication>
> {
  protected readonly tableName = 'rule_applications';

  private readonly logger = new Logger(RuleApplicationsRepository.name);

  constructor(
    @InjectRepository(RuleApplication)
    repository: Repository<RuleApplication>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a plan's ledger rows, oldest first. Only rows of live rules: a
   * soft-deleted rule keeps its ledger rows, but they are reachable only through a live rule.
   *
   * An explicit INNER JOIN, not a nested `where: { rule: { deletedAt: IsNull() } }`: TypeORM
   * LEFT JOINs a where-only relation and puts the soft-delete guard in its ON clause, so a
   * soft-deleted rule joins as NULL and the nested IsNull matches it.
   */
  async listForPlan(planId: string): Promise<RuleApplication[]> {
    return this.repository
      .createQueryBuilder('application')
      .innerJoin('application.rule', 'rule')
      .where('application.planId = :planId', { planId })
      .andWhere('rule.deletedAt IS NULL')
      .orderBy('application.createdAt', 'ASC')
      .getMany();
  }

  /**
   * @description The fingerprint check: the ledger row for (rule, plan) in any state, or null.
   */
  async findByRuleAndPlan(
    ruleId: string,
    planId: string,
  ): Promise<RuleApplication | null> {
    return this.findOne({ where: { planId, ruleId } });
  }

  /**
   * @description Writes a ledger row. On a unique-violation race the existing row wins and is
   * returned unchanged: callers must treat that as "someone else already applied this rule" and
   * perform no action.
   */
  async record(input: RecordRuleApplicationInput): Promise<RuleApplication> {
    try {
      return await this.create({
        details: input.details ?? null,
        planId: input.planId,
        ruleId: input.ruleId,
        state: input.state,
        taskId: input.taskId ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const winner = await this.findByRuleAndPlan(input.ruleId, input.planId);
        if (winner != null) return winner;
      }
      throw error;
    }
  }

  /**
   * @description Upserts the (rule, plan) ledger row to the given state/task, keyed on the
   * UNIQUE (rule_id, plan_id) fingerprint. Unlike {@link RuleApplicationsRepository.record}
   * (insert-or-return-existing, for first-time apply), this OVERWRITES an existing row's
   * state/task_id: the re-inject path uses it to move a delete-reset ('applied' with NULL task)
   * or 'orphaned' row back to 'applied' with the freshly injected/revived task.
   */
  async upsertApplication(input: RecordRuleApplicationInput): Promise<void> {
    const existing = await this.findByRuleAndPlan(input.ruleId, input.planId);
    const values = {
      details: input.details ?? null,
      planId: input.planId,
      ruleId: input.ruleId,
      state: input.state,
      taskId: input.taskId ?? null,
    };

    // A set id makes save() an UPDATE of the existing (rule, plan) row; leaving it unset
    // inserts. create()/save() accept the jsonb `details` (unknown) that the stricter
    // upsert()/update() partial-entity type rejects.
    const entity = this.repository.create(
      existing == null ? values : { ...values, id: existing.id },
    );
    await this.repository.save(entity);
  }

  /**
   * @description The plan's injected tasks that share `placement`, in a stable deterministic
   * tiebreak order (rule created_at, then application created_at, then rule id). Only 'applied'
   * inject-task rows with a LIVE rule and a live task outside `terminalTaskStatuses`
   * participate. Placement is read from the rule's action_payload; an absent value defaults to
   * 'first' (matching the payload schema default).
   */
  async listEdgePlacementSiblings(
    planId: string,
    placement: 'first' | 'last',
    terminalTaskStatuses: readonly string[],
  ): Promise<EdgePlacementSibling[]> {
    const query = this.repository
      .createQueryBuilder('application')
      .innerJoin('application.rule', 'rule')
      .innerJoin('application.task', 'task')
      .select('task.id', 'taskId')
      .addSelect('task.sortOrder', 'sortOrder')
      .where('application.planId = :planId', { planId })
      .andWhere('application.state = :applied', {
        applied: RULE_APPLICATION_STATES.APPLIED,
      })
      .andWhere('rule.actionType = :actionType', {
        actionType: TAG_ACTION_TYPES.INJECT_TASK,
      })
      .andWhere('rule.deletedAt IS NULL')
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.status NOT IN (:...terminal)', {
        terminal: terminalTaskStatuses,
      })
      .orderBy('rule.createdAt', 'ASC')
      .addOrderBy('application.createdAt', 'ASC')
      .addOrderBy('rule.id', 'ASC');

    if (placement === 'first') {
      query.andWhere(
        "(rule.action_payload->>'placement' = 'first' OR rule.action_payload->>'placement' IS NULL)",
      );
    } else {
      query.andWhere("rule.action_payload->>'placement' = :placement", {
        placement,
      });
    }

    const rows = await query.getRawMany<{
      sortOrder: number | string;
      taskId: string;
    }>();
    return rows.map((row) => {
      return { sortOrder: Number(row.sortOrder), taskId: row.taskId };
    });
  }

  /**
   * @description Flips 'applied' rows to 'orphaned' for rules that no longer match the plan.
   * Only applied rows flip: pre-satisfied/flagged/orphaned rows are left as-is. Any injected
   * task carried by a flipped row (non-null task_id, an INJECT_TASK result) is soft-closed to
   * SKIPPED in the same transaction, unless it is already terminal
   * (COMPLETED/PROMOTED/SKIPPED/CANCELED) or a human already deleted it (task_id SET NULL). The
   * ledger row is untouched so the rule still never re-injects. Rows of a soft-deleted rule
   * are left alone (the rule no longer evaluates, so it neither matches nor orphans; its
   * injected task is not soft-closed). Returns the number of rows flipped.
   *
   * `captureOrphanedTaskStatusChange`, when supplied, is invoked once per task actually
   * soft-closed (never for a task the terminal-status guard excluded), inside the SAME
   * transaction as the write: see `OrphanedTaskStatusCapture` for why this package takes the
   * capture as a callback instead of a DI-injected work-ledger service.
   */
  async orphanUnmatchedApplications(
    planId: string,
    matchedRuleIds: readonly string[],
    captureOrphanedTaskStatusChange?: OrphanedTaskStatusCapture,
  ): Promise<number> {
    // INNER JOIN on the live rule: see listForPlan for why a nested where cannot do this.
    const applied = await this.repository
      .createQueryBuilder('application')
      .innerJoin('application.rule', 'rule')
      .where('application.planId = :planId', { planId })
      .andWhere('application.state = :applied', {
        applied: RULE_APPLICATION_STATES.APPLIED,
      })
      .andWhere('rule.deletedAt IS NULL')
      .getMany();
    const matched = new Set(matchedRuleIds);
    const toOrphan = applied.filter((row) => !matched.has(row.ruleId));
    if (toOrphan.length === 0) {
      return 0;
    }

    const injectedTaskIds = toOrphan
      .map((row) => row.taskId)
      .filter((taskId): taskId is string => taskId != null);
    const nonTerminalStatuses = TASK_STATUS_VALUES.filter((status) => {
      return !IS_TERMINAL_TASK_STATUS[status];
    });

    await this.repository.manager.transaction(async (manager) => {
      await manager.update(
        RuleApplication,
        { id: In(toOrphan.map((row) => row.id)) },
        { state: RULE_APPLICATION_STATES.ORPHANED },
      );

      if (injectedTaskIds.length === 0) return;

      // Select-lock-update: a bulk `.update()` has no per-row `from`, and a supplied capture
      // needs each task's own real prior status. Mirrors the shape of
      // openthrottle-server's applyBulkTaskStatusChange (reimplemented here, not imported:
      // this package cannot depend on that server-side module).
      const taskRepo = manager.getRepository(Task);
      const affected = await taskRepo
        .createQueryBuilder('task')
        .setLock('pessimistic_write')
        .where('task.id IN (:...ids)', { ids: injectedTaskIds })
        .andWhere('task.status IN (:...nonTerminal)', {
          nonTerminal: nonTerminalStatuses,
        })
        .getMany();

      if (affected.length === 0) return;

      const ids = affected.map((task) => task.id);
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ status: SOFT_CLOSED_TASK_STATUS })
        .where('id IN (:...ids)', { ids })
        .execute();

      if (captureOrphanedTaskStatusChange == null) return;

      await Promise.all(
        affected.map((task) => {
          return captureOrphanedTaskStatusChange({
            fromStatus: task.status,
            manager,
            planId,
            taskId: task.id,
          });
        }),
      );
    });

    if (injectedTaskIds.length > 0) {
      this.logger.debug(
        `Soft-closed up to ${injectedTaskIds.length} orphaned injected task(s) on plan ${planId}`,
      );
    }

    return toOrphan.length;
  }
}
