/**
 * @description TypeORM entity for the scheduled_agent_job_webhook_deliveries table (databases/openthrottle/migrations/182):
 * the append-only log of every webhook request that matched a trigger, rejections included.
 * Extends `BaseHardDeleteModel`; `createdAt` is the moment the request was received. Raw bodies
 * are never stored, only `bodySha256` and `bodyBytes`. Purged after 7 days by the data-retention
 * sweep.
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type {
  ScheduledAgentJobWebhookDeliveryStatus,
  ScheduledAgentJobWebhookRejectReason,
} from './scheduled-agent-job-webhook-deliveries.types.ts';

@Entity('scheduled_agent_job_webhook_deliveries')
export class ScheduledAgentJobWebhookDelivery extends BaseHardDeleteModel {
  @Column({ default: 0, name: 'body_bytes', type: 'integer' })
  bodyBytes!: number;

  @Column({ name: 'body_sha256', type: 'text' })
  bodySha256!: string;

  /** Sender delivery id, else the body sha256; null when rejected before it was computed. */
  @Column({ name: 'dedupe_key', nullable: true, type: 'text' })
  dedupeKey!: string | null;

  /** Index of the filter that excluded a filtered delivery. */
  @Column({ name: 'filter_index', nullable: true, type: 'integer' })
  filterIndex!: number | null;

  /** Allow-listed request headers only; never the signature. */
  @Column({ default: () => `'{}'::jsonb`, name: 'headers', type: 'jsonb' })
  headers!: Readonly<Record<string, string>>;

  @Column({ name: 'http_status', type: 'integer' })
  httpStatus!: number;

  @Column({ name: 'reject_reason', nullable: true, type: 'text' })
  rejectReason!: ScheduledAgentJobWebhookRejectReason | null;

  /** The exact (redacted) prompt the run started with. */
  @Column({ name: 'rendered_prompt', nullable: true, type: 'text' })
  renderedPrompt!: string | null;

  /** The run this delivery started (accepted) or was folded into (coalesced). */
  @Column({ name: 'run_id', nullable: true, type: 'uuid' })
  runId!: string | null;

  @Column({ name: 'scheduled_agent_job_id', type: 'uuid' })
  scheduledAgentJobId!: string;

  @Column({ name: 'status', type: 'text' })
  status!: ScheduledAgentJobWebhookDeliveryStatus;

  @Column({ name: 'trigger_id', type: 'uuid' })
  triggerId!: string;
}
