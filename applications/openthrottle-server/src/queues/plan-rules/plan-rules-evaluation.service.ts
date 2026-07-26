/**
 * @description Producer for plan-rules:evaluate. Mutation paths call
 * enqueueEvaluation AFTER their own write has committed (each TypeORM save is
 * its own transaction; callers enqueue after the awaited service call
 * returns), so the worker never evaluates uncommitted state. Enqueue failures
 * are logged and swallowed — a tag write must not fail because Redis is down;
 * the next trigger re-evaluates the full plan (evaluation is always a full
 * pass, and the ledger makes redelivery safe).
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Queue } from 'bullmq';
import {
  PLAN_RULES_EVALUATE_JOB_NAME,
  PLAN_RULES_QUEUE_NAME,
  planRulesEvaluationDedupId,
} from './plan-rules.constants';
import type {
  PlanRulesEvaluateJobData,
  PlanRulesTriggerKind,
} from './plan-rules.types';

@Injectable()
export class PlanRulesEvaluationService {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(PLAN_RULES_QUEUE_NAME)
    private readonly queue: Queue<PlanRulesEvaluateJobData>,
  ) {}

  /**
   * @description Enqueues one full-evaluation pass for the plan. Fire-and-forget
   * from mutation paths; never throws.
   *
   * Passes are deduplicated per plan (`keepLastIfActive: true`): a burst of
   * triggers for one plan collapses into at most one active + one waiting pass,
   * so two passes for the same plan never run concurrently and the reconcile
   * step's `UNIQUE(plan_id, sort_order)` writes cannot race a sibling pass.
   * Distinct plans keep distinct dedup ids, so they still evaluate in parallel.
   *
   * We deliberately use `deduplication` rather than a fixed `jobId`: BullMQ
   * ignores an `add` whose `jobId` still exists in the completed/failed sets
   * (retained by removeOnComplete/removeOnFail), which would silently drop a
   * needed re-run. Dedup keys are independent of those sets and are released
   * when the pass completes or fails, so the next trigger always enqueues.
   */
  async enqueueEvaluation(
    planId: string,
    triggerKind: PlanRulesTriggerKind,
  ): Promise<void> {
    try {
      await this.queue.add(
        PLAN_RULES_EVALUATE_JOB_NAME,
        {
          planId,
          triggerKind,
        },
        {
          deduplication: {
            id: planRulesEvaluationDedupId(planId),
            keepLastIfActive: true,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue plan-rules evaluation for plan ${planId} (${triggerKind}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRulesEvaluationService.name,
      );
    }
  }
}
