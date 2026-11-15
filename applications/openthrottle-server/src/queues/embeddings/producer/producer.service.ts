/**
 * @description Enqueues embed-entity jobs. Called by the entity subscriber after a write commits
 * and by the reconciler. Fire-and-forget: an enqueue failure is logged at error and swallowed,
 * because a plan or task write must never fail on Redis — the reconciler re-finds anything
 * that was missed.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Queue } from 'bullmq';

import {
  EMBED_ENTITY_BACKOFF_DELAY_MS,
  EMBED_ENTITY_JOB_ATTEMPTS,
  EMBED_ENTITY_JOB_NAME,
  EMBED_ENTITY_REMOVE_ON_FAIL_AGE_SECONDS,
  EMBEDDINGS_QUEUE_NAME,
} from '../embeddings.constants.ts';
import type { EmbedEntityJobData } from '../embeddings.types.ts';
import { embeddingJobId } from '../embeddings.utils.ts';

@Injectable()
export class EmbeddingsProducerService {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(EMBEDDINGS_QUEUE_NAME)
    private readonly queue: Queue<EmbedEntityJobData>,
  ) {}

  /**
   * @description Enqueues one job per item, deduped by `<entity>.<id>`: while a job for a row
   * is waiting or delayed, another write to it adds nothing (the job reads the row fresh when
   * it runs). Completed jobs are removed at once so a later write can enqueue again.
   * @returns How many jobs the queue accepted (0 when Redis is unavailable).
   */
  async enqueue(items: readonly EmbedEntityJobData[]): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    try {
      const jobs = await this.queue.addBulk(
        items.map((item) => {
          return {
            data: { entity: item.entity, id: item.id },
            name: EMBED_ENTITY_JOB_NAME,
            opts: {
              attempts: EMBED_ENTITY_JOB_ATTEMPTS,
              backoff: {
                delay: EMBED_ENTITY_BACKOFF_DELAY_MS,
                type: 'exponential',
              },
              jobId: embeddingJobId(item.entity, item.id),
              removeOnComplete: true,
              removeOnFail: { age: EMBED_ENTITY_REMOVE_ON_FAIL_AGE_SECONDS },
            },
          };
        }),
      );

      return jobs.length;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue ${items.length} embedding job(s): ${error instanceof Error ? error.message : String(error)}`,
        EmbeddingsProducerService.name,
      );

      return 0;
    }
  }
}
