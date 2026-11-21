/**
 * @description Types for the scheduled_agent_job_webhook_deliveries module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ScheduledAgentJobWebhookDeliveriesRepository } from './scheduled-agent-job-webhook-deliveries.repository.ts';
import type { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

/**
 * @description accepted | deduplicated | filtered | coalesced | rejected | rate_limited |
 * queue_full.
 * @public
 */
export type ScheduledAgentJobWebhookDeliveryStatus =
  | 'accepted'
  | 'coalesced'
  | 'deduplicated'
  | 'filtered'
  | 'queue_full'
  | 'rate_limited'
  | 'rejected';

/**
 * @description Why a `rejected` delivery was refused.
 * @public
 */
export type ScheduledAgentJobWebhookRejectReason =
  | 'bad_signature'
  | 'invalid_json'
  | 'missing_timestamp'
  | 'payload_too_large'
  | 'stale_timestamp'
  | 'unsupported_media_type';

/**
 * @description Fields to append a delivery row.
 * @public
 */
export interface RecordScheduledAgentJobWebhookDeliveryInput {
  readonly bodyBytes: number;
  readonly bodySha256: string;
  readonly dedupeKey: string | null;
  readonly filterIndex: number | null;
  readonly headers: Readonly<Record<string, string>>;
  readonly httpStatus: number;
  readonly rejectReason: ScheduledAgentJobWebhookRejectReason | null;
  readonly renderedPrompt: string | null;
  readonly runId: string | null;
  readonly scheduledAgentJobId: string;
  readonly status: ScheduledAgentJobWebhookDeliveryStatus;
  readonly triggerId: string;
}

/**
 * @description Outcome of {@link ScheduledAgentJobWebhookDeliveriesRepository.recordDelivery}:
 * `duplicate` means the (trigger, dedupe key) pair already holds an accepted or coalesced row.
 * @public
 */
export type RecordScheduledAgentJobWebhookDeliveryResult =
  | {
      readonly delivery: ScheduledAgentJobWebhookDelivery;
      readonly kind: 'recorded';
    }
  | { readonly kind: 'duplicate' };

/**
 * @description The custom (non-`BaseRepository`) methods of
 * {@link ScheduledAgentJobWebhookDeliveriesRepository}.
 * @public
 */
export type ScheduledAgentJobWebhookDeliveriesRepositoryMethod =
  | 'attachRun'
  | 'countAcceptedSince'
  | 'deleteDelivery'
  | 'findLatestAcceptedSince'
  | 'hasDedupeKey'
  | 'listDeliveriesForJob'
  | 'recordDelivery';

/**
 * @description One `Mock` per {@link ScheduledAgentJobWebhookDeliveriesRepositoryMethod}.
 * @public
 */
export type ScheduledAgentJobWebhookDeliveriesRepositoryMethodMocks = {
  readonly [
    TMethod in ScheduledAgentJobWebhookDeliveriesRepositoryMethod
  ]: Mock<ScheduledAgentJobWebhookDeliveriesRepository[TMethod]>;
};

/**
 * @description A {@link ScheduledAgentJobWebhookDeliveriesRepository} mock.
 * @public
 */
export interface ScheduledAgentJobWebhookDeliveriesRepositoryMock
  extends
    BaseRepositoryMock<
      ScheduledAgentJobWebhookDelivery,
      CreateModelInput<ScheduledAgentJobWebhookDelivery>
    >,
    ScheduledAgentJobWebhookDeliveriesRepositoryMethodMocks {}
