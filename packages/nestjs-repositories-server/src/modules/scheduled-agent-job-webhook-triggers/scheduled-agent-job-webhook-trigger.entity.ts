/**
 * @description TypeORM entity for the scheduled_agent_job_webhook_triggers table (databases/openthrottle/migrations/182):
 * the webhook trigger of a scheduled agent job (at most one per job). Extends `BaseHardDeleteModel`
 * and declares its own `updated_at`: a trigger is removed for real (a job delete fires no foreign
 * key action, so the service deletes it). `tokenHash` and `secretCiphertext` never leave the
 * server; the GraphQL surface exposes only `tokenPrefix`.
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, UpdateDateColumn } from 'typeorm';

import type {
  ScheduledAgentJobWebhookFilter,
  ScheduledAgentJobWebhookPreset,
  ScheduledAgentJobWebhookSignatureEncoding,
} from './scheduled-agent-job-webhook-triggers.types.ts';

@Entity('scheduled_agent_job_webhook_triggers')
export class ScheduledAgentJobWebhookTrigger extends BaseHardDeleteModel {
  @Column({ default: 0, name: 'coalesce_window_ms', type: 'integer' })
  coalesceWindowMs!: number;

  /** Header carrying the sender delivery id (dedupe key); null falls back to the body sha256. */
  @Column({ name: 'delivery_id_header', nullable: true, type: 'text' })
  deliveryIdHeader!: string | null;

  /** Gates ingress only; the job's own `enabled` gates its schedule. */
  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  /** At most 16 filters, all of which must match. */
  @Column({ default: () => `'[]'::jsonb`, name: 'filters', type: 'jsonb' })
  filters!: readonly ScheduledAgentJobWebhookFilter[];

  @Column({ default: 3, name: 'max_in_flight', type: 'integer' })
  maxInFlight!: number;

  @Column({ default: 30, name: 'rate_limit_per_minute', type: 'integer' })
  rateLimitPerMinute!: number;

  @Column({
    name: 'rotated_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  rotatedAt!: Date | null;

  @Column({ name: 'scheduled_agent_job_id', type: 'uuid' })
  scheduledAgentJobId!: string;

  /** AES-256-GCM: IV || auth tag || ciphertext. Never plaintext. */
  @Column({ name: 'secret_ciphertext', type: 'bytea' })
  secretCiphertext!: Buffer;

  @Column({ default: 'hex', name: 'signature_encoding', type: 'text' })
  signatureEncoding!: ScheduledAgentJobWebhookSignatureEncoding;

  @Column({
    default: 'X-OT-Signature',
    name: 'signature_header',
    type: 'text',
  })
  signatureHeader!: string;

  @Column({ default: 'generic', name: 'signature_preset', type: 'text' })
  signaturePreset!: ScheduledAgentJobWebhookPreset;

  /** Header carrying the signed unix-seconds timestamp; null when the preset has none. */
  @Column({ name: 'timestamp_header', nullable: true, type: 'text' })
  timestampHeader!: string | null;

  @Column({
    default: 300,
    name: 'timestamp_tolerance_seconds',
    type: 'integer',
  })
  timestampToleranceSeconds!: number;

  /** sha256 of the URL token; the token itself is shown once and never stored. */
  @Column({ name: 'token_hash', type: 'bytea' })
  tokenHash!: Buffer;

  /** First 6 characters of the URL token, for display. */
  @Column({ name: 'token_prefix', type: 'text' })
  tokenPrefix!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
