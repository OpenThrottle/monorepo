/**
 * @description The embeddings guarantee and backfill (OT plan 165e86ef). Each cycle — on boot
 * and every 15 minutes — walks plans, tasks, documentation, custom prompts and code chunks
 * (OT plan e489d73d; re-embedded from their own `content`, never pruned here) in keyset pages
 * (100 ids by default) and enqueues every row whose vector is missing, from another model, or
 * hashed from text that has since changed. Writes the entity subscriber cannot see (raw-SQL
 * ingest, documentation) and jobs that failed or were lost are caught here. A cycle is skipped,
 * not failed, while the embedder is unconfigured: re-enqueueing work that can only re-delay
 * would just grow the queue.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { EMBEDDING_MAX_INPUT_CHARS } from '@openthrottle/node-client';
import { DataSource } from 'typeorm';

import { BACKGROUND_ACTIVITY_KINDS } from '../../services/background-activity-registry/background-activity-registry.constants.ts';
import { BackgroundActivityRegistryService } from '../../services/background-activity-registry/background-activity-registry.service.ts';
import { EmbedderService } from '../../services/embedder/embedder.service.ts';
import {
  EMBEDDABLE_ENTITIES,
  EMBEDDING_SOURCES,
  EMBEDDINGS_BACKFILL_LABELS,
} from '../embeddings/embeddings.constants.ts';
import type {
  EmbeddableEntity,
  EmbeddingBackfillSource,
} from '../embeddings/embeddings.types.ts';
import {
  embeddingsBackfillActivityId,
  readEntityId,
} from '../embeddings/embeddings.utils.ts';
import { EmbeddingsProducerService } from '../embeddings/producer/producer.service.ts';
import {
  EMBEDDINGS_RECONCILE_QUEUE_NAME,
  MIN_UUID,
} from './embeddings-reconcile.constants.ts';
import type {
  EmbeddingsReconcileEntitySummary,
  EmbeddingsReconcileJob,
  EmbeddingsReconcileSummary,
} from './embeddings-reconcile.types.ts';
import {
  buildPruneOrphansSql,
  buildStaleCodeChunksSql,
  buildStaleRowsSql,
  resolveEmbeddingsReconcileConfig,
} from './embeddings-reconcile.utils.ts';

@Processor(EMBEDDINGS_RECONCILE_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: 1,
})
export class EmbeddingsReconcileProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly logger: LoggerService,
    private readonly embedder: EmbedderService,
    private readonly producer: EmbeddingsProducerService,
    private readonly activities: BackgroundActivityRegistryService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close();
  }

  async process(
    job: EmbeddingsReconcileJob,
  ): Promise<EmbeddingsReconcileSummary> {
    const config = this.embedder.getConfig();
    const status = this.embedder.getStatus();

    if (
      !config ||
      status.state === 'unconfigured' ||
      status.state === 'dimension_mismatch'
    ) {
      const reason = `embedder ${status.state}: ${status.detail ?? 'not configured'}`;

      this.logger.warn(
        `Embeddings reconcile skipped (job ${job.id ?? '?'}): ${reason}`,
        EmbeddingsReconcileProcessor.name,
      );

      return { reason, skipped: true };
    }

    const { batchSize } = resolveEmbeddingsReconcileConfig();
    const entities: Partial<
      Record<EmbeddableEntity, EmbeddingsReconcileEntitySummary>
    > = {};

    // Entities run one after another so a cycle holds at most one page in memory.
    for (const entity of EMBEDDABLE_ENTITIES) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design, see above
      entities[entity] = await this.reconcileEntity(
        entity,
        config.spec.documentPrefix,
        config.model,
        batchSize,
      );
    }

    const code = await this.reconcileCodeChunks(
      config.spec.documentPrefix,
      config.model,
      batchSize,
    );
    const summary = {
      custom_prompt: entities.custom_prompt ?? { enqueued: 0, pruned: 0 },
      documentation: entities.documentation ?? { enqueued: 0, pruned: 0 },
      plan: entities.plan ?? { enqueued: 0, pruned: 0 },
      task: entities.task ?? { enqueued: 0, pruned: 0 },
    };

    this.logger.info(
      `Embeddings reconcile: ${EMBEDDABLE_ENTITIES.map((entity) => {
        return `${entity} +${summary[entity].enqueued}/-${summary[entity].pruned}`;
      }).join(', ')}, code +${code.enqueued}`,
      EmbeddingsReconcileProcessor.name,
    );

    return { code, entities: summary, skipped: false };
  }

  private async reconcileEntity(
    entity: EmbeddableEntity,
    documentPrefix: string,
    model: string,
    batchSize: number,
  ): Promise<EmbeddingsReconcileEntitySummary> {
    const source = EMBEDDING_SOURCES[entity];
    const pruned = await this.prune(buildPruneOrphansSql(source));
    const staleSql = buildStaleRowsSql(source);
    const backlog = this.trackBacklog(entity);
    let after = MIN_UUID;
    let enqueued = 0;

    // Keyset walk: each page starts after the last id of the previous one, so rows that are
    // still stale while their jobs run are never re-read within the same cycle.
    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- each page depends on the previous one's last id
      const rows: unknown = await this.dataSource.query(staleSql, [
        documentPrefix,
        EMBEDDING_MAX_INPUT_CHARS,
        model,
        after,
        batchSize,
      ]);
      const ids = readIds(rows);
      const last = ids[ids.length - 1];

      if (!last) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop -- the page joins the total before its jobs can finish
      await backlog.found(ids.length);
      // eslint-disable-next-line no-await-in-loop -- enqueue before reading the next page
      enqueued += await this.producer.enqueue(
        ids.map((id) => {
          return { backfill: true, entity, id };
        }),
      );

      if (ids.length < batchSize) {
        break;
      }

      after = last;
    }

    await backlog.close();

    return { enqueued, pruned };
  }

  /**
   * @description Keyset walk over `code_embeddings`, one embedding job per stale page. Nothing is
   * pruned: which chunks exist is the code-index queue's call (and data retention's).
   * @returns `enqueued` counts chunks, not jobs.
   */
  private async reconcileCodeChunks(
    documentPrefix: string,
    model: string,
    batchSize: number,
  ): Promise<EmbeddingsReconcileEntitySummary> {
    const staleSql = buildStaleCodeChunksSql();
    const backlog = this.trackBacklog('code');
    let after = '';
    let enqueued = 0;

    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- each page depends on the previous one's last id
      const rows: unknown = await this.dataSource.query(staleSql, [
        documentPrefix,
        EMBEDDING_MAX_INPUT_CHARS,
        model,
        after,
        batchSize,
      ]);
      const ids = readIds(rows);
      const last = ids[ids.length - 1];

      if (!last) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop -- the page joins the total before its job can finish
      await backlog.found(ids.length);
      // eslint-disable-next-line no-await-in-loop -- enqueue before reading the next page
      const accepted = await this.producer.enqueueCodeChunks(ids);

      enqueued += accepted * ids.length;

      if (ids.length < batchSize) {
        break;
      }

      after = last;
    }

    await backlog.close();

    return { enqueued, pruned: 0 };
  }

  /**
   * @description Reports one source's walk to its `embeddings_backfill` activity (OT plan
   * 5767e798). The first stale page opens the activity; while this cycle owns a new activity each
   * page joins its total before being enqueued, so the processor can never finish it early. When
   * the activity was already running (a previous cycle's backlog), the total is re-measured at the
   * end as done + what is still stale — re-found rows whose jobs are still queued are not counted
   * twice. A walk that found nothing finishes the activity: the backlog drained.
   */
  private trackBacklog(source: EmbeddingBackfillSource): {
    readonly close: () => Promise<void>;
    readonly found: (count: number) => Promise<void>;
  } {
    const id = embeddingsBackfillActivityId(source);
    let created: boolean | undefined;
    let found = 0;

    return {
      close: async (): Promise<void> => {
        if (found === 0) {
          await this.activities.finish(id);
        } else if (created === false) {
          await this.activities.rebase(id, found);
        }
      },
      found: async (count: number): Promise<void> => {
        found += count;

        if (created === undefined) {
          created = await this.activities.start({
            id,
            kind: BACKGROUND_ACTIVITY_KINDS.embeddingsBackfill,
            label: EMBEDDINGS_BACKFILL_LABELS[source],
            total: 0,
          });
        }

        if (created) {
          await this.activities.grow(id, count);
        }
      },
    };
  }

  private async prune(sql: string): Promise<number> {
    const result: unknown = await this.dataSource.query(sql);

    // node-postgres DELETE through TypeORM resolves to [rows, affectedCount].
    if (Array.isArray(result) && typeof result[1] === 'number') {
      return result[1];
    }

    return 0;
  }
}

function readIds(rows: unknown): string[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row: unknown) => {
    const id = readEntityId(row);

    return id ? [id] : [];
  });
}
