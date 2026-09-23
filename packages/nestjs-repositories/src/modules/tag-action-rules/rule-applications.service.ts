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
import { type EntityManager, In, QueryFailedError, Repository } from 'typeorm';

import {
  isTaskStatus,
  TASK_STATUS,
  type TaskStatus,
} from '../../common/plan-task-status.constants.ts';
import { Task } from '../tasks/task.entity.ts';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
  type RuleApplicationState,
} from './rule-application.entity.ts';

/**
 * @description Status an orphaned injected task is soft-closed to (reversible).
 * Exported so the re-inject/revive path can recognize a task it previously
 * soft-closed and reopen exactly that state.
 * @public
 */
export const SOFT_CLOSED_TASK_STATUS = 'SKIPPED';

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

/** @public */
export interface RecordRuleApplicationInput {
  readonly details?: unknown;
  readonly planId: string;
  readonly ruleId: string;
  readonly state: RuleApplicationState;
  readonly taskId?: string | null;
}

/**
 * @description One injected task's soft-close to {@link SOFT_CLOSED_TASK_STATUS}, performed by
 * {@link RuleApplicationsService.orphanUnmatchedApplications}. Callers that capture the work-ledger
 * `status_change` fact need the `from` side, which a bulk "rows affected" count alone can't give
 * them — the same reason {@link PlanStatusTransition} (tasks.service.ts) exists.
 * @public
 */
export interface OrphanedTaskSoftClose {
  readonly from: TaskStatus;
  readonly planId: string;
  readonly taskId: string;
  readonly to: typeof SOFT_CLOSED_TASK_STATUS;
}

/**
 * @description Result of {@link RuleApplicationsService.orphanUnmatchedApplications}: the number of
 * ledger rows flipped to 'orphaned', plus the (possibly empty) task transitions performed as a side
 * effect. The caller owns capturing those transitions on the work ledger — this package deliberately
 * has no dependency on WorkLedgerCaptureService.
 * @public
 */
export interface OrphanUnmatchedApplicationsResult {
  readonly rowsOrphaned: number;
  readonly softClosedTasks: readonly OrphanedTaskSoftClose[];
}

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
   * transaction, unless it is already terminal (COMPLETED/SKIPPED/CANCELED) or
   * a human already deleted it (task_id SET NULL). The ledger row is untouched
   * so the rule still never re-injects.
   *
   * The soft-close moves a task to a TERMINAL status (unlike the operational-reset
   * paths this codebase leaves uncaptured, which move work back toward PENDING/
   * QUEUED/IN_PROGRESS), so it asserts a new fact about the work rather than just
   * putting it back in a restartable state — the caller is expected to capture it
   * on the work ledger (see the decision recorded at the call site in
   * plan-rules.processor.ts). This package has no dependency on
   * WorkLedgerCaptureService, so it cannot write that fact itself: it returns the
   * transitions performed instead, mirroring {@link PlanStatusTransition}
   * (tasks.service.ts). Accepts a caller-owned `manager` so the row updates and
   * the caller's ledger write commit in the SAME transaction; without one it opens
   * its own (the eligibility read needs a lock either way).
   */
  async orphanUnmatchedApplications(
    planId: string,
    matchedRuleIds: readonly string[],
    manager?: EntityManager,
  ): Promise<OrphanUnmatchedApplicationsResult> {
    const applied = await this.repository.find({
      where: { planId, state: RULE_APPLICATION_STATES.APPLIED },
    });
    const matched = new Set(matchedRuleIds);
    const toOrphan = applied.filter((row) => !matched.has(row.ruleId));
    if (toOrphan.length === 0) {
      return { rowsOrphaned: 0, softClosedTasks: [] };
    }

    const injectedTaskIds = toOrphan
      .map((row) => row.taskId)
      .filter((taskId): taskId is string => taskId != null);

    const run = async (
      tx: EntityManager,
    ): Promise<OrphanUnmatchedApplicationsResult> => {
      await tx.update(
        RuleApplication,
        { id: In(toOrphan.map((row) => row.id)) },
        { state: RULE_APPLICATION_STATES.ORPHANED },
      );

      if (injectedTaskIds.length === 0) {
        return { rowsOrphaned: toOrphan.length, softClosedTasks: [] };
      }

      // Row-lock before reading: the `from` side of each transition, and which
      // tasks are even eligible (not already terminal), must be read under the
      // same lock the soft-close UPDATE runs under — mirrors the row-lock-before-
      // read precedent in tasks.service.ts's syncParentPlanStatus.
      const lockedTasks = await tx.getRepository(Task).find({
        lock: { mode: 'pessimistic_write' },
        where: { id: In(injectedTaskIds) },
      });
      // task.status is a raw DB `string` column; narrow it through the shared
      // isTaskStatus guard rather than an `as` cast (a Postgres check constraint
      // guarantees it is always a real TaskStatus in practice).
      const eligible = lockedTasks.flatMap((task) => {
        const { status } = task;
        if (!isTaskStatus(status) || IS_TERMINAL_TASK_STATUS[status]) {
          return [];
        }
        return [{ id: task.id, status }];
      });

      if (eligible.length === 0) {
        return { rowsOrphaned: toOrphan.length, softClosedTasks: [] };
      }

      await tx.update(
        Task,
        { id: In(eligible.map((task) => task.id)) },
        { status: SOFT_CLOSED_TASK_STATUS },
      );

      return {
        rowsOrphaned: toOrphan.length,
        softClosedTasks: eligible.map((task) => ({
          from: task.status,
          planId,
          taskId: task.id,
          to: SOFT_CLOSED_TASK_STATUS,
        })),
      };
    };

    const result =
      manager != null
        ? await run(manager)
        : await this.repository.manager.transaction(run);

    if (result.softClosedTasks.length > 0) {
      this.logger.debug(
        `Soft-closed ${result.softClosedTasks.length} orphaned injected task(s) on plan ${planId}`,
        RuleApplicationsService.name,
      );
    }

    return result;
  }
}
