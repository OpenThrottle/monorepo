/**
 * @description The rule_applications apply-once ledger. UNIQUE (rule_id,
 * plan_id) is the idempotency fingerprint: `record` treats a unique-violation
 * race as "the other writer won" and returns the existing row, so at-least-once
 * BullMQ redelivery and concurrent evaluation are safe. States only ever move
 * forward (applied → orphaned); actions are never undone.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { In, QueryFailedError, Repository } from 'typeorm';

import {
  TASK_STATUS,
  TASK_STATUS_VALUES,
} from '../../../config/config.constants.ts';
import type { TaskStatus } from '../../../config/config.types.ts';
import { Task } from '../../tasks/task.entity.ts';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
} from '../rule-application.entity.ts';
import { SOFT_CLOSED_TASK_STATUS } from './rule-applications.constants.ts';
import type {
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

@Injectable()
export class RuleApplicationsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(RuleApplication)
    private readonly repository: Repository<RuleApplication>,
  ) {
    this.logger.debug('🧾 rule-applications 🧾');
  }

  /**
   * @description Returns the TypeORM repository for rule applications.
   */
  getRepository(): Repository<RuleApplication> {
    return this.repository;
  }

  /**
   * @description Lists a plan's ledger rows, oldest first.
   */
  async listForPlan(planId: string): Promise<RuleApplication[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { planId },
    });
  }

  /**
   * @description The fingerprint check: the ledger row for (rule, plan) in any
   * state, or null.
   */
  async findByRuleAndPlan(
    ruleId: string,
    planId: string,
  ): Promise<RuleApplication | null> {
    return this.repository.findOne({ where: { planId, ruleId } });
  }

  /**
   * @description Writes a ledger row. On a unique-violation race the existing
   * row wins and is returned unchanged — callers must treat that as "someone
   * else already applied this rule" and perform no action.
   */
  async record(input: RecordRuleApplicationInput): Promise<RuleApplication> {
    const entity = this.repository.create({
      details: input.details ?? null,
      planId: input.planId,
      ruleId: input.ruleId,
      state: input.state,
      taskId: input.taskId ?? null,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const winner = await this.findByRuleAndPlan(input.ruleId, input.planId);
        if (winner != null) return winner;
      }
      throw error;
    }
  }

  /**
   * @description Upserts the (rule, plan) ledger row to the given state/task,
   * keyed on the UNIQUE (rule_id, plan_id) fingerprint. Unlike {@link record}
   * (insert-or-return-existing, for first-time apply), this OVERWRITES an
   * existing row's state/task_id — the re-inject path uses it to move a
   * delete-reset ('applied' with NULL task) or 'orphaned' row back to 'applied'
   * with the freshly injected/revived task.
   */
  async upsertApplication(input: RecordRuleApplicationInput): Promise<void> {
    const existing = await this.findByRuleAndPlan(input.ruleId, input.planId);
    const entity = this.repository.create({
      details: input.details ?? null,
      planId: input.planId,
      ruleId: input.ruleId,
      state: input.state,
      taskId: input.taskId ?? null,
    });
    // A set id makes save() an UPDATE of the existing (rule, plan) row; leaving
    // it unset inserts. create()/save() accept the jsonb `details` (unknown)
    // that the stricter upsert()/update() partial-entity type rejects.
    if (existing != null) {
      entity.id = existing.id;
    }
    await this.repository.save(entity);
  }

  /**
   * @description Flips 'applied' rows to 'orphaned' for rules that no longer
   * match the plan. Only applied rows flip — pre-satisfied/flagged/orphaned
   * rows are left as-is. Any injected task carried by a flipped row (non-null
   * task_id, an INJECT_TASK result) is soft-closed to SKIPPED in the same
   * transaction, unless it is already terminal (COMPLETED/PROMOTED/SKIPPED/CANCELED) or
   * a human already deleted it (task_id SET NULL). The ledger row is untouched
   * so the rule still never re-injects. Returns the number of rows flipped.
   *
   * `captureOrphanedTaskStatusChange`, when supplied, is invoked once per task actually
   * soft-closed (never for a task the terminal-status guard excluded), inside the SAME
   * transaction as the write — see {@link OrphanedTaskStatusCapture}'s doc comment for why this
   * package takes the capture as a callback instead of a DI-injected work-ledger service.
   */
  async orphanUnmatchedApplications(
    planId: string,
    matchedRuleIds: readonly string[],
    captureOrphanedTaskStatusChange?: OrphanedTaskStatusCapture,
  ): Promise<number> {
    const applied = await this.repository.find({
      where: { planId, state: RULE_APPLICATION_STATES.APPLIED },
    });
    const matched = new Set(matchedRuleIds);
    const toOrphan = applied.filter((row) => !matched.has(row.ruleId));
    if (toOrphan.length === 0) {
      return 0;
    }

    const injectedTaskIds = toOrphan
      .map((row) => row.taskId)
      .filter((taskId): taskId is string => taskId != null);
    const nonTerminalStatuses = TASK_STATUS_VALUES.filter(
      (status) => !IS_TERMINAL_TASK_STATUS[status],
    );

    await this.repository.manager.transaction(async (manager) => {
      await manager.update(
        RuleApplication,
        { id: In(toOrphan.map((row) => row.id)) },
        { state: RULE_APPLICATION_STATES.ORPHANED },
      );

      if (injectedTaskIds.length === 0) return;

      // Select-lock-update: a bulk `.update()` has no per-row `from`, and a supplied capture
      // needs each task's own real prior status. Mirrors the shape of
      // openthrottle-server's applyBulkTaskStatusChange (reimplemented here, not imported —
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
        affected.map((task) =>
          captureOrphanedTaskStatusChange({
            fromStatus: task.status,
            manager,
            planId,
            taskId: task.id,
          }),
        ),
      );
    });

    if (injectedTaskIds.length > 0) {
      this.logger.debug(
        `Soft-closed up to ${injectedTaskIds.length} orphaned injected task(s) on plan ${planId}`,
        RuleApplicationsService.name,
      );
    }

    return toOrphan.length;
  }
}
