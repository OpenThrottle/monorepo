/**
 * @description Enqueues embed-entity jobs. Called by the entity subscriber after a write commits
 * and by the reconciler. Fire-and-forget: an enqueue failure is logged at error and swallowed,
 * because a plan or task write must never fail on Redis — the reconciler re-finds anything
 * that was missed.
 */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { toErrorMessage } from '@openthrottle/nodejs-utils';
import { Queue } from 'bullmq';

import {
  EMBED_CODE_CHUNKS_JOB_NAME,
  EMBED_ENTITY_BACKOFF_DELAY_MS,
  EMBED_ENTITY_JOB_ATTEMPTS,
  EMBED_ENTITY_JOB_NAME,
  EMBED_ENTITY_REMOVE_ON_FAIL_AGE_SECONDS,
  EMBEDDINGS_QUEUE_NAME,
} from '../embeddings.constants.ts';
import type {
  EmbeddingsJobData,
  EmbedEntityJobData,
} from '../embeddings.types.ts';
import { codeChunksJobId, embeddingJobId } from '../embeddings.utils.ts';

const RETRY_OPTIONS = {
  attempts: EMBED_ENTITY_JOB_ATTEMPTS,
  backoff: { delay: EMBED_ENTITY_BACKOFF_DELAY_MS, type: 'exponential' },
  removeOnComplete: true,
  removeOnFail: { age: EMBED_ENTITY_REMOVE_ON_FAIL_AGE_SECONDS },
} as const;

@Injectable()
export class EmbeddingsProducerService {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(EMBEDDINGS_QUEUE_NAME)
    private readonly queue: Queue<EmbeddingsJobData>,
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
            data: item.backfill
              ? { backfill: true, entity: item.entity, id: item.id }
              : { entity: item.entity, id: item.id },
            name: EMBED_ENTITY_JOB_NAME,
            opts: {
              ...RETRY_OPTIONS,
              jobId: embeddingJobId(item.entity, item.id),
            },
          };
        }),
      );

      return jobs.length;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue ${items.length} embedding job(s): ${toErrorMessage(error)}`,
        EmbeddingsProducerService.name,
      );

      return 0;
    }
  }

  /**
   * @description Enqueues one job that re-embeds a page of code chunks in place, deduped by the
   * page's first id. Same retry policy and failure handling as {@link enqueue}.
   * @returns 1 when the queue accepted the job, 0 for an empty page or when Redis is unavailable.
   */
  async enqueueCodeChunks(ids: readonly string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    try {
      await this.queue.add(
        EMBED_CODE_CHUNKS_JOB_NAME,
        { entity: 'code', ids: [...ids] },
        { ...RETRY_OPTIONS, jobId: codeChunksJobId(ids) },
      );

      return 1;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to enqueue a code-chunk embedding job (${ids.length} chunks): ${toErrorMessage(error)}`,
        EmbeddingsProducerService.name,
      );

      return 0;
    }
  }
}
