/**
 * @description The after-run policy for a programmatic plan run's worktree — the host-side
 * equivalent of `/ot-loop`'s teardown step (`skills/ot-loop/references/teardown.md`).
 *
 * A teardown is attempted only when every condition holds:
 *   1. the run was provisioned into its own worktree (not the base checkout);
 *   2. it finished `workflow_complete` or `workflow_tasks_exhausted`;
 *   3. the host finalize step opened a PR;
 *   4. the plan's `ralph.worktreeCleanup` is not `'keep'` (read at teardown time, so it holds for
 *      every enqueue path and a mid-run switch to `'keep'` is honoured).
 * The teardown service then applies its own guards (clean, pushed, no live run) and has the final
 * say. Whatever happens, ONE plan_output line records it. Never throws: the run is already
 * settled, and nothing here may change that.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlanOutputStreamService,
  planRunConfigFromPlanStorage,
  PlansService,
} from '@openthrottle/nestjs-repositories';

import { PlanRunWorktreeTeardownService } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import { describePlanRunWorktreeTeardown } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.utils.ts';
import {
  PLAN_RUN_WORKTREE_CLEANUP_SKIP,
  PLAN_RUN_WORKTREE_TEARDOWN_REASONS,
} from './plan-run-worktree-cleanup.constants.ts';
import type {
  PlanRunWorktreeCleanupOutcome,
  PlanRunWorktreeCleanupParams,
  PlanRunWorktreeCleanupSkip,
} from './plan-run-worktree-cleanup.types.ts';

const OUTPUT_PREFIX = '[plan-run-worktree-teardown]';

@Injectable()
export class PlanRunWorktreeCleanupService {
  private readonly name = 'plan-run-worktree-cleanup';

  constructor(
    private readonly logger: LoggerService,
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly plansService: PlansService,
    private readonly teardownService: PlanRunWorktreeTeardownService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Applies the policy to a settled run whose afterAll hooks have finished, and
   * writes one plan_output line with the outcome (none when the run had no worktree).
   */
  async afterRun(
    params: PlanRunWorktreeCleanupParams,
  ): Promise<PlanRunWorktreeCleanupOutcome> {
    try {
      const outcome = await this.decideAndTeardown(params);
      await this.recordOutcome(params, outcome);
      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[${this.name}] plan ${params.planId}: worktree cleanup failed: ${message}`,
      );
      return {
        detail: message,
        kind: 'skipped',
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.PLAN_UNREADABLE,
      };
    }
  }

  private async decideAndTeardown(
    params: PlanRunWorktreeCleanupParams,
  ): Promise<PlanRunWorktreeCleanupOutcome> {
    const { planId, prNumber, reason, worktree } = params;

    if (worktree === null) {
      return this.skipped(
        PLAN_RUN_WORKTREE_CLEANUP_SKIP.NO_WORKTREE,
        'the run worked in the base checkout',
      );
    }
    if (!PLAN_RUN_WORKTREE_TEARDOWN_REASONS.includes(reason)) {
      return this.skipped(
        PLAN_RUN_WORKTREE_CLEANUP_SKIP.REASON,
        `the run ended with ${reason}`,
      );
    }
    if (prNumber === undefined) {
      return this.skipped(
        PLAN_RUN_WORKTREE_CLEANUP_SKIP.NO_PR,
        'the run opened no PR',
      );
    }

    const setting = await this.readWorktreeCleanupSetting(planId);
    if (setting === null) {
      return this.skipped(
        PLAN_RUN_WORKTREE_CLEANUP_SKIP.PLAN_UNREADABLE,
        'the plan could not be read, so its worktree cleanup setting is unknown',
      );
    }
    if (setting === 'keep') {
      return this.skipped(
        PLAN_RUN_WORKTREE_CLEANUP_SKIP.KEEP,
        `the plan's worktree cleanup is set to keep`,
      );
    }

    const result = await this.teardownService.teardown(worktree);
    return { kind: 'attempted', result };
  }

  /** The plan's `ralph.worktreeCleanup`, or null when the plan cannot be read. */
  private async readWorktreeCleanupSetting(
    planId: string,
  ): Promise<'keep' | 'on-pr' | null> {
    try {
      const plan = await this.plansService
        .getRepository()
        .findOne({ where: { id: planId } });
      if (plan === null) return null;

      // An unparsable stored config reads as the defaults, exactly as the Configuration tab shows it.
      return planRunConfigFromPlanStorage(plan.runConfig, { planId }).ralph
        .worktreeCleanup;
    } catch (error) {
      this.logger.warn(
        `[${this.name}] could not read plan ${planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async recordOutcome(
    params: PlanRunWorktreeCleanupParams,
    outcome: PlanRunWorktreeCleanupOutcome,
  ): Promise<void> {
    if (params.worktree === null) return;

    const content = this.describe(params.worktree.worktreePath, outcome);
    this.logger.log(`[${this.name}] plan ${params.planId}: ${content}`);

    try {
      const repo = this.planOutputStreamService.getRepository();
      await repo.save(
        repo.create({ content, iteration: null, planId: params.planId }),
      );
    } catch (error) {
      this.logger.warn(
        `[${this.name}] could not write plan output for ${params.planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private describe(
    worktreePath: string,
    outcome: PlanRunWorktreeCleanupOutcome,
  ): string {
    if (outcome.kind === 'attempted') {
      return describePlanRunWorktreeTeardown(outcome.result);
    }
    return `${OUTPUT_PREFIX} kept worktree ${worktreePath}: ${outcome.detail}`;
  }

  private skipped(
    skip: PlanRunWorktreeCleanupSkip,
    detail: string,
  ): PlanRunWorktreeCleanupOutcome {
    return { detail, kind: 'skipped', skip };
  }
}
