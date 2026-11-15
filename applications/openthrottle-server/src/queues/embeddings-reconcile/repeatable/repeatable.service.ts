import { InjectQueue } from '@nestjs/bullmq';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Queue } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../../repeatable-job/repeatable-job.options.ts';
import { resolveRepeatablesOwner } from '../../repeatable-job/repeatable-job.utils.ts';
import {
  EMBEDDINGS_RECONCILE_JOB_NAME,
  EMBEDDINGS_RECONCILE_QUEUE_NAME,
} from '../embeddings-reconcile.constants.ts';
import { resolveEmbeddingsReconcileConfig } from '../embeddings-reconcile.utils.ts';

/** @description Delay before the boot cycle, so the embedder's boot probe has settled first. */
const BOOT_CYCLE_DELAY_MS = 30_000;

/**
 * @description Registers the embeddings reconciler: a repeatable every
 * `EMBEDDINGS_RECONCILE_INTERVAL_MINUTES` (default 15) plus one cycle shortly after boot. Only
 * the checkout that owns repeatables registers it, so a shared-DB worktree never reconciles
 * the primary's rows.
 */
@Injectable()
export class EmbeddingsReconcileRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(EMBEDDINGS_RECONCILE_QUEUE_NAME)
    private readonly queue: Queue<Record<string, never>>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveRepeatablesOwner();

    if (!ownership.owner) {
      this.logger.info(
        `Embeddings reconcile repeatable job not registered: ${ownership.reason}`,
        EmbeddingsReconcileRepeatableService.name,
      );
      return;
    }

    const { intervalMinutes } = resolveEmbeddingsReconcileConfig();
    const job = await this.queue.add(
      EMBEDDINGS_RECONCILE_JOB_NAME,
      {},
      {
        ...REPEATABLE_JOB_OPTIONS,
        repeat: { every: intervalMinutes * 60 * 1000 },
      },
    );

    await this.queue.add(
      EMBEDDINGS_RECONCILE_JOB_NAME,
      {},
      {
        delay: BOOT_CYCLE_DELAY_MS,
        // One pending boot cycle at most: restarts (dev watch mode, crash loops) would otherwise
        // stack a cycle per boot. Removed on completion, so the next boot can add it again.
        jobId: 'embeddings-reconcile-boot',
        removeOnComplete: true,
        removeOnFail: { age: 60 * 60 * 24 },
      },
    );

    this.logger.info(
      `Embeddings reconcile repeatable job registered: every ${intervalMinutes} min (+ boot cycle in ${BOOT_CYCLE_DELAY_MS / 1000}s), repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      EmbeddingsReconcileRepeatableService.name,
    );
  }
}
