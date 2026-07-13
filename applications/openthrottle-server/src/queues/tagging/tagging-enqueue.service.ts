/**
 * @description Producer for the tagging queue. Mutation paths call these
 * AFTER their write has committed. Enqueue failures are logged and swallowed
 * — creating a plan/task or linking a commit must never fail because Redis is
 * down. Deterministic job ids (tag-predict:<type>:<id>,
 * tag-refine:<planId>:<sha>) dedupe redeliveries of the same trigger.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Queue } from 'bullmq';
import {
  TAGGING_PREDICT_JOB_NAME,
  TAGGING_QUEUE_NAME,
  TAGGING_REFINE_JOB_NAME,
} from './tagging.constants';
import type {
  PredictTaggingJobData,
  RefineTaggingJobData,
  TaggingEntityType,
} from './tagging.types';

@Injectable()
export class TaggingEnqueueService {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(TAGGING_QUEUE_NAME)
    private readonly queue: Queue<PredictTaggingJobData | RefineTaggingJobData>,
  ) {}

  /**
   * @description Enqueues closed-vocabulary classification of a newly created
   * plan or task. Fire-and-forget; never throws.
   */
  async enqueuePredict(
    entityType: TaggingEntityType,
    entityId: string,
  ): Promise<void> {
    try {
      await this.queue.add(
        TAGGING_PREDICT_JOB_NAME,
        { entityId, entityType },
        { jobId: `tag-predict:${entityType}:${entityId}` },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue predict-tagging for ${entityType} ${entityId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        TaggingEnqueueService.name,
      );
    }
  }

  /**
   * @description Enqueues domain-tag refinement against a landed squash diff.
   * Fire-and-forget; never throws (link_commit latency is unaffected).
   */
  async enqueueRefine(
    planId: string,
    repo: string,
    sha: string,
  ): Promise<void> {
    try {
      await this.queue.add(
        TAGGING_REFINE_JOB_NAME,
        { planId, repo, sha },
        { jobId: `tag-refine:${planId}:${sha}` },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue refine-tagging for plan ${planId} @ ${sha}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        TaggingEnqueueService.name,
      );
    }
  }
}
