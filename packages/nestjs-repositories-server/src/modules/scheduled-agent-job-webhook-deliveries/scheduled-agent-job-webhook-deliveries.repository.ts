import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  isUniqueViolation,
} from '@openthrottle/nestjs-postgres';
import { In, Repository } from 'typeorm';

import type {
  RecordScheduledAgentJobWebhookDeliveryInput,
  RecordScheduledAgentJobWebhookDeliveryResult,
} from './scheduled-agent-job-webhook-deliveries.types.ts';
import { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

/** The statuses whose dedupe key is held by the partial unique index. */
const DEDUPE_HOLDING_STATUSES = ['accepted', 'coalesced'];

/**
 * @description Data access for the openthrottle `scheduled_agent_job_webhook_deliveries` table on
 * the default connection: an append-only log plus the counts ingress admission reads (rate cap,
 * dedupe, coalesce window), all from DB state so a restart cannot reset them.
 * @public
 */
@Injectable()
export class ScheduledAgentJobWebhookDeliveriesRepository extends BaseRepository<
  ScheduledAgentJobWebhookDelivery,
  CreateModelInput<ScheduledAgentJobWebhookDelivery>
> {
  protected readonly tableName = 'scheduled_agent_job_webhook_deliveries';

  constructor(
    @InjectRepository(ScheduledAgentJobWebhookDelivery)
    repository: Repository<ScheduledAgentJobWebhookDelivery>,
  ) {
    super(repository);
  }

  /** @description Point an already-recorded delivery at the run it started. */
  async attachRun(deliveryId: string, runId: string): Promise<void> {
    await this.repository.update({ id: deliveryId }, { runId });
  }

  /** @description Accepted deliveries of a trigger received at or after `since` (the rate cap). */
  async countAcceptedSince(triggerId: string, since: Date): Promise<number> {
    return this.repository
      .createQueryBuilder('delivery')
      .where('delivery.trigger_id = :triggerId', { triggerId })
      .andWhere(`delivery.status = 'accepted'`)
      .andWhere('delivery.created_at >= :since', { since })
      .getCount();
  }

  /** @description Remove one delivery row (used to roll back an accepted claim whose enqueue failed). */
  async deleteDelivery(deliveryId: string): Promise<void> {
    await this.repository.delete({ id: deliveryId });
  }

  /**
   * @description The newest accepted delivery of a trigger received at or after `since`, or null:
   * the leading edge of the coalesce window.
   */
  async findLatestAcceptedSince(
    triggerId: string,
    since: Date,
  ): Promise<ScheduledAgentJobWebhookDelivery | null> {
    return this.repository
      .createQueryBuilder('delivery')
      .where('delivery.trigger_id = :triggerId', { triggerId })
      .andWhere(`delivery.status = 'accepted'`)
      .andWhere('delivery.created_at >= :since', { since })
      .orderBy('delivery.created_at', 'DESC')
      .getOne();
  }

  /** @description Whether an accepted or coalesced delivery already holds `dedupeKey` for the trigger. */
  async hasDedupeKey(triggerId: string, dedupeKey: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        dedupeKey,
        status: In(DEDUPE_HOLDING_STATUSES),
        triggerId,
      },
    });

    return count > 0;
  }

  /** @description A job's delivery log, newest first. */
  async listDeliveriesForJob(
    scheduledAgentJobId: string,
    limit: number,
  ): Promise<ScheduledAgentJobWebhookDelivery[]> {
    return this.findBy({
      order: { createdAt: 'DESC' },
      take: limit,
      where: { scheduledAgentJobId },
    });
  }

  /**
   * @description Append a delivery row. An accepted or coalesced row whose dedupe key is already
   * held (a concurrent duplicate that raced past the dedupe check) comes back as `duplicate`.
   */
  async recordDelivery(
    input: RecordScheduledAgentJobWebhookDeliveryInput,
  ): Promise<RecordScheduledAgentJobWebhookDeliveryResult> {
    const draft = this.repository.create({
      bodyBytes: input.bodyBytes,
      bodySha256: input.bodySha256,
      dedupeKey: input.dedupeKey,
      filterIndex: input.filterIndex,
      headers: input.headers,
      httpStatus: input.httpStatus,
      rejectReason: input.rejectReason,
      renderedPrompt: input.renderedPrompt,
      runId: input.runId,
      scheduledAgentJobId: input.scheduledAgentJobId,
      status: input.status,
      triggerId: input.triggerId,
    });

    try {
      const delivery = await this.repository.save(draft);

      return { delivery, kind: 'recorded' };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { kind: 'duplicate' };
      }

      throw error;
    }
  }
}
