/**
 * @description Data-retention sweeper. Applies every registered retention policy
 * once per scheduled run, bounding growth of OpenThrottle's append-only agent
 * tables.
 *
 * DRY RUN BY DEFAULT. Unless `DATA_RETENTION_ENFORCE=true`, the sweep only counts
 * what each policy would remove and logs it. Retention deletes are irreversible
 * and the rows are real plan history, so enforcement is a deliberate operator
 * decision, not a deploy side effect.
 *
 * Deletes are batched: each statement removes at most DATA_RETENTION_BATCH_SIZE
 * rows so the sweep takes and releases row locks in short transactions instead of
 * holding them across the whole backlog while the app is still writing. A
 * per-policy batch cap stops a first enforced run against a large backlog from
 * turning into one unbounded pass.
 *
 * Idempotent: a second run with nothing past retention finds zero expired rows
 * and deletes nothing. One policy failing is contained — it is logged and the
 * remaining policies still run.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { DataSource } from 'typeorm';
import {
  DATA_RETENTION_BATCH_SIZE,
  DATA_RETENTION_MAX_BATCHES_PER_POLICY,
  DATA_RETENTION_QUEUE_NAME,
} from './data-retention.constants';
import { resolveDataRetentionConfig } from './data-retention.env';
import { DATA_RETENTION_POLICIES_TOKEN } from './data-retention.policies';
import type {
  DataRetentionJob,
  DataRetentionSweepSummary,
  RetentionPolicy,
  RetentionPolicyResult,
} from './data-retention.types';

const CONCURRENCY = 1;

@Processor(DATA_RETENTION_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class DataRetentionProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    @Inject(DATA_RETENTION_POLICIES_TOKEN)
    private readonly policies: readonly RetentionPolicy[],
  ) {
    super();
  }

  onModuleInit(): void {
    const { enforce } = resolveDataRetentionConfig();
    this.logger.info(
      `Data-retention worker started (concurrency=${CONCURRENCY}, mode=${enforce ? 'ENFORCING' : 'dry-run'}, policies=${this.policies.length})`,
      DataRetentionProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Data-retention worker shutting down (signal=${signal ?? 'unknown'})`,
      DataRetentionProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: DataRetentionJob): Promise<void> {
    const { enforce } = resolveDataRetentionConfig();

    this.logger.info(
      `Data-retention sweep started: jobId=${job.id}, mode=${enforce ? 'ENFORCING' : 'dry-run'}`,
      DataRetentionProcessor.name,
    );

    const summary = await this.sweep(enforce);

    for (const result of summary.results) {
      this.logger.info(
        `Data-retention ${result.policy} (${result.table}): expired=${result.expired}, deleted=${result.deleted}${result.cappedOut ? ' (hit batch cap, remainder next sweep)' : ''}`,
        DataRetentionProcessor.name,
      );
    }

    this.logger.info(
      summary.enforced
        ? `Data-retention sweep done: deleted=${summary.totalDeleted} of ${summary.totalExpired} expired row(s)`
        : `Data-retention sweep done (dry-run): ${summary.totalExpired} row(s) are past retention and WOULD be deleted. Set DATA_RETENTION_ENFORCE=true to enforce.`,
      DataRetentionProcessor.name,
    );
  }

  private async sweep(enforce: boolean): Promise<DataRetentionSweepSummary> {
    const results: RetentionPolicyResult[] = [];

    for (const policy of this.policies) {
      // eslint-disable-next-line no-await-in-loop -- policies run sequentially so one sweep never floods the pool with concurrent bulk deletes
      const result = await this.applyPolicy(policy, enforce);
      if (result) results.push(result);
    }

    return {
      enforced: enforce,
      results,
      totalDeleted: results.reduce((sum, r) => sum + r.deleted, 0),
      totalExpired: results.reduce((sum, r) => sum + r.expired, 0),
    };
  }

  /**
   * Applies one policy. Returns null when the policy threw — the failure is
   * logged and the sweep continues, so a broken rule for one table cannot stop
   * every other table from being pruned.
   */
  private async applyPolicy(
    policy: RetentionPolicy,
    enforce: boolean,
  ): Promise<RetentionPolicyResult | null> {
    try {
      const expired = await policy.countExpired(this.dataSource);

      if (!enforce || expired === 0) {
        return {
          cappedOut: false,
          deleted: 0,
          expired,
          policy: policy.name,
          table: policy.table,
        };
      }

      let deleted = 0;
      let batches = 0;
      let cappedOut = false;

      while (batches < DATA_RETENTION_MAX_BATCHES_PER_POLICY) {
        // eslint-disable-next-line no-await-in-loop -- each batch is its own short transaction; running them concurrently would defeat the point
        const removed = await policy.deleteBatch(
          this.dataSource,
          DATA_RETENTION_BATCH_SIZE,
        );
        deleted += removed;
        batches += 1;

        // A short batch means the backlog is drained.
        if (removed < DATA_RETENTION_BATCH_SIZE) break;

        if (batches === DATA_RETENTION_MAX_BATCHES_PER_POLICY) cappedOut = true;
      }

      return {
        cappedOut,
        deleted,
        expired,
        policy: policy.name,
        table: policy.table,
      };
    } catch (error) {
      this.logger.error(
        `Data-retention policy ${policy.name} (${policy.table}) failed; continuing with remaining policies: ${error instanceof Error ? error.message : String(error)}`,
        DataRetentionProcessor.name,
      );

      return null;
    }
  }
}
