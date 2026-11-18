import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { FindOptionsWhere } from 'typeorm';
import { In, Repository } from 'typeorm';

import { PlanOutputStreamChunk } from '../plan-output-stream/plan-output-stream-chunk.entity.ts';
import { Plan } from '../plans/plan.entity.ts';
import { PlanMessage } from './plan-message.entity.ts';
import {
  PLAN_MESSAGE_DELIVERABLE_KINDS,
  PLAN_MESSAGE_KIND,
  PLAN_MESSAGE_STATUS,
} from './plan-messages.constants.ts';
import type {
  ClaimPlanMessagesParams,
  ClaimPlanMessagesResult,
  EditPendingPlanMessageParams,
  ListPlanMessagesParams,
  PendingPlanMessageWriteResult,
  PostPlanMessageParams,
  PostPlanMessageResult,
} from './plan-messages.types.ts';

/**
 * @description Orders claimed messages for delivery: every STEER before any QUEUE, oldest first
 * within each kind.
 */
const compareForDelivery = (a: PlanMessage, b: PlanMessage): number => {
  const rank = (message: PlanMessage): number => {
    return message.kind === PLAN_MESSAGE_KIND.STEER ? 0 : 1;
  };
  const byKind = rank(a) - rank(b);

  if (byKind !== 0) return byKind;

  return a.createdAt.getTime() - b.createdAt.getTime();
};

/**
 * @description The audit text recorded on the plan output stream for one claim. Each message keeps
 * its `[inbox:<KIND> from @<author>]` header so the stream stays readable on its own.
 */
const formatAuditContent = (
  messages: readonly PlanMessage[],
  params: ClaimPlanMessagesParams,
): string => {
  const target = params.taskId ? ` to task ${params.taskId}` : '';
  const run = params.planRunId ? ` (run ${params.planRunId})` : '';
  const noun = messages.length === 1 ? 'message' : 'messages';
  const header = `[inbox] Delivered ${messages.length} human ${noun}${target}${run}.`;
  const entries = messages.map(
    (message) =>
      `[inbox:${message.kind} from @${message.author}] (message ${message.id})\n${message.body}`,
  );

  return [header, ...entries].join('\n\n');
};

/**
 * @description Data access for the openthrottle `plan_messages` table (the plan inbox) on the
 * default connection: the `BaseRepository` CRUD plus posting, listing, the PENDING-guarded edit and
 * withdraw, and the transactional claim that delivers STEER/QUEUE messages to a run. A delete is a
 * hard delete, since messages are history.
 * @public
 */
@Injectable()
export class PlanMessagesRepository extends BaseRepository<
  PlanMessage,
  CreateModelInput<PlanMessage>
> {
  protected readonly tableName = 'plan_messages';

  constructor(
    @InjectRepository(PlanMessage)
    repository: Repository<PlanMessage>,
  ) {
    super(repository);
  }

  /**
   * @description Lists a plan's inbox oldest first, optionally narrowed to some kinds and statuses.
   */
  async listMessages(params: ListPlanMessagesParams): Promise<PlanMessage[]> {
    const where: FindOptionsWhere<PlanMessage> = {
      planId: params.planId,
      ...(params.kinds && params.kinds.length > 0
        ? { kind: In([...params.kinds]) }
        : {}),
      ...(params.statuses && params.statuses.length > 0
        ? { status: In([...params.statuses]) }
        : {}),
    };

    return this.repository.find({
      order: { createdAt: 'ASC' },
      where,
    });
  }

  /**
   * @description Posts a message to a plan's inbox. STEER/QUEUE start PENDING; FEEDBACK is
   * RECORDED (never delivered).
   */
  async postMessage(
    params: PostPlanMessageParams,
  ): Promise<PostPlanMessageResult> {
    const planExists = await this.repository.manager
      .getRepository(Plan)
      .exists({ where: { id: params.planId } });

    if (!planExists) return { ok: false, reason: 'PLAN_NOT_FOUND' };

    const isFeedback = params.kind === PLAN_MESSAGE_KIND.FEEDBACK;
    const status = isFeedback
      ? PLAN_MESSAGE_STATUS.RECORDED
      : PLAN_MESSAGE_STATUS.PENDING;
    const entity = this.repository.create({
      author: params.author,
      body: params.body,
      deliveredAt: null,
      deliveredToTaskId: null,
      kind: params.kind,
      planId: params.planId,
      planRunId: null,
      status,
      taskId: params.taskId,
    });
    const message = await this.repository.save(entity);

    return { message, ok: true };
  }

  /**
   * @description Replaces the body of a PENDING message. A delivered, withdrawn or recorded
   * message is immutable.
   */
  async editPendingMessage(
    params: EditPendingPlanMessageParams,
  ): Promise<PendingPlanMessageWriteResult> {
    return this.writePending(params.id, { body: params.body });
  }

  /**
   * @description Withdraws a PENDING message so no run receives it.
   */
  async withdrawPendingMessage(
    id: string,
  ): Promise<PendingPlanMessageWriteResult> {
    return this.writePending(id, { status: PLAN_MESSAGE_STATUS.WITHDRAWN });
  }

  /**
   * @description Atomically claims every PENDING STEER/QUEUE message on the plan: marks them
   * DELIVERED (stamping the run and the task they were delivered to) and appends one audit chunk to
   * plan_output_stream, all in one transaction. The pending rows are locked FOR UPDATE, so two
   * concurrent claimers can never both receive a message, and a delivery is never unrecorded.
   */
  async claimPendingMessages(
    params: ClaimPlanMessagesParams,
  ): Promise<ClaimPlanMessagesResult> {
    return this.repository.manager.transaction(async (manager) => {
      const messageRepo = manager.getRepository(PlanMessage);
      const pending = await messageRepo.find({
        lock: { mode: 'pessimistic_write' },
        order: { createdAt: 'ASC' },
        where: {
          kind: In([...PLAN_MESSAGE_DELIVERABLE_KINDS]),
          planId: params.planId,
          status: PLAN_MESSAGE_STATUS.PENDING,
        },
      });

      if (pending.length === 0) return { auditChunk: null, messages: [] };

      const ids = pending.map((message) => message.id);

      await messageRepo.update(
        { id: In(ids) },
        {
          deliveredAt: new Date(),
          deliveredToTaskId: params.taskId,
          planRunId: params.planRunId,
          status: PLAN_MESSAGE_STATUS.DELIVERED,
        },
      );

      const delivered = await messageRepo.find({ where: { id: In(ids) } });
      const messages = [...delivered].sort(compareForDelivery);
      const chunkRepo = manager.getRepository(PlanOutputStreamChunk);
      const auditChunk = await chunkRepo.save(
        chunkRepo.create({
          content: formatAuditContent(messages, params),
          iteration: null,
          planId: params.planId,
          taskId: params.taskId,
        }),
      );

      return { auditChunk, messages };
    });
  }

  /**
   * @description Applies a write guarded on `status = PENDING` in the UPDATE itself, so a message
   * claimed between the caller's read and this write is never edited after delivery.
   */
  private async writePending(
    id: string,
    patch: Partial<Pick<PlanMessage, 'body' | 'status'>>,
  ): Promise<PendingPlanMessageWriteResult> {
    const result = await this.repository.update(
      { id, status: PLAN_MESSAGE_STATUS.PENDING },
      patch,
    );
    const message = await this.repository.findOne({
      where: { id },
    });

    if (!message) return { ok: false, reason: 'NOT_FOUND' };
    if ((result.affected ?? 0) === 0) {
      return { ok: false, reason: 'NOT_PENDING' };
    }

    return { message, ok: true };
  }
}
