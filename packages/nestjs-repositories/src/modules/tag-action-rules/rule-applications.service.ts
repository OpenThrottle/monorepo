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
import { Task } from '../tasks/task.entity';
import {
  RULE_APPLICATION_STATES,
  RuleApplication,
  type RuleApplicationState,
} from './rule-application.entity';

/**
 * @description Status an orphaned injected task is soft-closed to (reversible).
 * Exported so the re-inject/revive path can recognize a task it previously
 * soft-closed and reopen exactly that state.
 * @public
 */
export const SOFT_CLOSED_TASK_STATUS = 'SKIPPED';

/** Terminal task statuses left untouched by the orphan soft-close. */
const TERMINAL_TASK_STATUSES = ['CANCELED', 'COMPLETED', 'SKIPPED'] as const;

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
   * so the rule still never re-injects. Returns the number of rows flipped.
   */
  async orphanUnmatchedApplications(
    planId: string,
    matchedRuleIds: readonly string[],
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

    await this.repository.manager.transaction(async (manager) => {
      await manager.update(
        RuleApplication,
        { id: In(toOrphan.map((row) => row.id)) },
        { state: RULE_APPLICATION_STATES.ORPHANED },
      );

      if (injectedTaskIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ status: SOFT_CLOSED_TASK_STATUS })
          .where('id IN (:...ids)', { ids: injectedTaskIds })
          .andWhere('status NOT IN (:...terminal)', {
            terminal: [...TERMINAL_TASK_STATUSES],
          })
          .execute();
      }
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
