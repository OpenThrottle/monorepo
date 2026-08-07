/**
 * @description Validate-and-enqueue for task→plan promotion, keeping the resolver thin
 * (validate → call → map). Mirrors the enqueue conventions in queues.service.ts:
 * a caller idempotency key is normalized before the enqueue and reused as the BullMQ
 * jobId so a re-submitted mutation enqueues at most one job. The promotion itself is
 * done by the task-promotion worker (TaskPromotionService); this service only guards
 * promotability and hands the job off.
 *
 * Promotable = the task exists, is not a lifecycle-hook task, and is not already
 * promoted (SKIPPED with the `promoted` tag — the same terminal state the worker's
 * idempotency guard recognizes). Returns a discriminated result the resolver maps to
 * the GraphQL result object; it never throws for validation failures.
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TagsService, TasksService } from '@openthrottle/nestjs-repositories';
import { normalizeIdempotencyKey } from '../../graphql/queues/queues.service';
import {
  PROMOTED_TAG,
  PROMOTED_TASK_STATUS,
  TASK_PROMOTION_PROMOTE_JOB_NAME,
  TASK_PROMOTION_QUEUE_NAME,
} from './task-promotion.constants';
import type {
  PromoteTaskJobData,
  PromoteTaskJobResult,
} from './task-promotion.types';

export interface EnqueuePromotionParams {
  readonly actorServiceAccountId: string | null;
  readonly actorUserId: string | null;
  readonly idempotencyKey?: string | null;
  readonly taskId: string;
}

export type EnqueuePromotionResult =
  { readonly jobId: string } | { readonly error: string };

@Injectable()
export class TaskPromotionEnqueueService {
  constructor(
    private readonly tagsService: TagsService,
    private readonly tasksService: TasksService,
    @InjectQueue(TASK_PROMOTION_QUEUE_NAME)
    private readonly queue: Queue<PromoteTaskJobData, PromoteTaskJobResult>,
  ) {}

  /**
   * @description Validate the task is promotable and enqueue a promotion job. The
   * caller idempotency key (validated first, so we never enqueue then reject) doubles
   * as the BullMQ jobId; when omitted the key defaults to `promote-<taskId>` so the
   * UX stays idempotent per task without a client-supplied key. The default uses a
   * hyphen, not a colon: BullMQ rejects custom job ids containing ':'.
   */
  async enqueuePromotion(
    params: EnqueuePromotionParams,
  ): Promise<EnqueuePromotionResult> {
    const { actorServiceAccountId, actorUserId, idempotencyKey, taskId } =
      params;

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    if ('error' in normalizedKey) {
      return { error: normalizedKey.error };
    }

    const task = await this.tasksService
      .getRepository()
      .findOne({ where: { id: taskId } });
    if (task == null) {
      return { error: `Task not found: ${taskId}` };
    }
    if (task.hookRole != null) {
      return { error: 'Lifecycle-hook tasks cannot be promoted to a plan.' };
    }

    if (task.status === PROMOTED_TASK_STATUS) {
      const promotedTag = await this.tagsService
        .getTaskTagsRepository()
        .findOne({ where: { tag: PROMOTED_TAG, taskId } });
      if (promotedTag != null) {
        return { error: 'Task has already been promoted to a plan.' };
      }
    }

    const jobId = normalizedKey.key ?? `promote-${taskId}`;
    const job = await this.queue.add(
      TASK_PROMOTION_PROMOTE_JOB_NAME,
      { actorServiceAccountId, actorUserId, idempotencyKey: jobId, taskId },
      { jobId },
    );

    return { jobId: String(job.id ?? jobId) };
  }
}
