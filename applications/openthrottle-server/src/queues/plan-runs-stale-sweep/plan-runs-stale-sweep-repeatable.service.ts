import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkspaceEditorConfigService } from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';
import { ForeignSkillInjectionLifecycleService } from '../../services/foreign-skill-injection/foreign-skill-injection-lifecycle.service';
import { ForeignSkillMaterializationService } from '../../services/foreign-skill-injection/foreign-skill-materialization.service';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import { PLAN_RUNS_STALE_SWEEP_QUEUE_NAME } from './plan-runs-stale-sweep.constants';
import type { PlanRunsStaleSweepJobData } from './plan-runs-stale-sweep.types';

/**
 * @description Cron pattern: every minute at second 0 (sec min hour day month dow). The passive
 * reader already makes the UX honest instantly; the sweeper's job is the durable settle + plan
 * reconcile, so ~1-min lag is fine and the indexed cutoff scan is cheap.
 */
const CRON_PATTERN = '0 * * * * *';

const JOB_NAME = 'Sweep Stale Plan Runs';

/**
 * @description Registers the repeatable stale-plan-run sweep on app bootstrap, and rides that same
 * boot lifecycle to reap any foreign-skill layer stranded in a consumer repo by a prior server/run
 * that crashed before its shutdown teardown (no bespoke marker system — the per-repo ledgers ARE the
 * markers). Boot-once, before any run of this server materializes a layer, so it only ever removes
 * genuinely stranded layers.
 *
 * Immediately after that reap it reconciles the other direction: every checkout still flagged for
 * injection gets its layer re-projected, so the flag and the disk agree from boot rather than from
 * the next run. Order is load-bearing — reap clears stranded ledgers, reconcile rebuilds what should
 * be there; swapping them would tear down what was just rebuilt.
 */
@Injectable()
export class PlanRunsStaleSweepRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME)
    private readonly queue: Queue<PlanRunsStaleSweepJobData, void>,
    private readonly logger: LoggerService,
    private readonly foreignSkillInjectionLifecycle: ForeignSkillInjectionLifecycleService,
    private readonly foreignSkillMaterialization: ForeignSkillMaterializationService,
    private readonly workspaceEditorConfigService: WorkspaceEditorConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Crash recovery for foreign-skill injection, riding the stale-sweep boot lifecycle.
    this.foreignSkillInjectionLifecycle.reapStrandedLedgers();

    // …then rebuild the layer for every checkout still opted in. Soft-fail: a repo that has moved or
    // gone read-only must never stop the server from booting.
    try {
      const reconciled =
        await this.foreignSkillMaterialization.remateralizeEnabledCheckouts();
      if (reconciled > 0) {
        this.logger.info(
          `Foreign-skill injection: reconciled ${reconciled} opted-in checkout(s) at boot`,
          PlanRunsStaleSweepRepeatableService.name,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Soft-fail reconciling foreign-skill injection at boot: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunsStaleSweepRepeatableService.name,
      );
    }

    // Back-fill the git-exclude entry for OT's workspace-editors manifest in repos configured
    // before that exclude existed. Independent of the foreign-skill reconcile above — different
    // feature, different block — so it gets its own try/catch rather than sharing a failure.
    try {
      const reconciled =
        await this.workspaceEditorConfigService.reconcileManifestExclusions();
      if (reconciled > 0) {
        this.logger.info(
          `Workspace-editors: reconciled the manifest exclude in ${reconciled} checkout(s) at boot`,
          PlanRunsStaleSweepRepeatableService.name,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Soft-fail reconciling workspace-editors manifest exclusions at boot: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunsStaleSweepRepeatableService.name,
      );
    }

    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Plan-runs stale sweep repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      PlanRunsStaleSweepRepeatableService.name,
    );
  }
}
