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
import { GlobalClsService, LoggerService } from '@openthrottle/nestjs-modules';
import { Queue } from 'bullmq';

import {
  PLAN_RULES_EVALUATE_JOB_NAME,
  PLAN_RULES_QUEUE_NAME,
} from '../plan-rules.constants.ts';
import type {
  PlanRulesEnvironment,
  PlanRulesEvaluateJobData,
  PlanRulesTriggerKind,
} from '../plan-rules.types.ts';
import {
  parsePlanRulesEnvironment,
  planRulesEvaluationDedupId,
} from '../plan-rules.utils.ts';

@Injectable()
export class PlanRulesEvaluationService {
  constructor(
    private readonly globalCls: GlobalClsService,
    private readonly logger: LoggerService,
    @InjectQueue(PLAN_RULES_QUEUE_NAME)
    private readonly queue: Queue<PlanRulesEvaluateJobData>,
  ) {}

  /**
   * @description The environment the current GraphQL request claims to run in, from the
   * `x-ot-environment` header the openthrottle-mcp stdio server sets from its launch environment
   * (`ci` under CI, `ralph` when an orchestrator spawned the agent, `interactive` for an agent
   * harness with neither). Null outside a request context, without the header, or for a value
   * outside `ci | interactive | ralph`. The developer UI sends no header, so a human's edit is a
   * null pass. A claim, not a proof: it only selects which of the plan OWNER's own rules apply, so
   * a caller that misstates it misconfigures nothing but its own pass.
   */
  requestEnvironment(): PlanRulesEnvironment {
    if (!this.globalCls.isActive()) return null;

    return parsePlanRulesEnvironment(this.globalCls.get('environment'));
  }

  /**
   * @description Enqueues one full-evaluation pass for the plan. Fire-and-forget
   * from mutation paths; never throws.
   *
   * `environment` is the caller's environment (`ci | interactive | ralph`) when
   * the trigger genuinely knows it, else null; the worker evaluates with it, so
   * environment-qualified rules match only for a matching environment. Every
   * caller states it explicitly: request-scoped callers (resolvers) pass
   * {@link requestEnvironment}; a background trigger with no request passes null.
   *
   * Passes are deduplicated per plan AND environment (`keepLastIfActive: true`):
   * a burst of triggers for one plan in one environment collapses into at most
   * one active + one waiting pass (last write wins). Passes for different
   * environments of the same plan do not collapse, because rules are apply-once
   * per (rule, plan) and a null pass replacing a pending `ralph` one would drop
   * the ralph-only matches; they can therefore overlap on the same plan, which
   * the ledger fingerprint check, the deterministic reconcile targets and the
   * worker's out-of-environment orphan exclusion make safe.
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
    environment: PlanRulesEnvironment,
  ): Promise<void> {
    try {
      await this.queue.add(
        PLAN_RULES_EVALUATE_JOB_NAME,
        {
          environment,
          planId,
          triggerKind,
        },
        {
          deduplication: {
            id: planRulesEvaluationDedupId(planId, environment),
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
