/**
 * @description Types for the scheduled_agent_job_webhook_triggers module.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ScheduledAgentJobWebhookTrigger } from './scheduled-agent-job-webhook-trigger.entity.ts';
import type {
  SCHEDULED_AGENT_JOB_WEBHOOK_FILTER_OPS,
  SCHEDULED_AGENT_JOB_WEBHOOK_PRESETS,
} from './scheduled-agent-job-webhook-triggers.constants.ts';
import type { ScheduledAgentJobWebhookTriggersRepository } from './scheduled-agent-job-webhook-triggers.repository.ts';

/**
 * @description generic | github | custom. See the Signature table in
 * docs/openthrottle/webhook-triggered-agent-jobs.md.
 * @public
 */
export type ScheduledAgentJobWebhookPreset =
  (typeof SCHEDULED_AGENT_JOB_WEBHOOK_PRESETS)[number];

/**
 * @description How a signature header encodes the HMAC digest.
 * @public
 */
export type ScheduledAgentJobWebhookSignatureEncoding = 'base64' | 'hex';

/**
 * @description equals | not_equals | in | exists | not_exists | prefix.
 * @public
 */
export type ScheduledAgentJobWebhookFilterOp =
  (typeof SCHEDULED_AGENT_JOB_WEBHOOK_FILTER_OPS)[number];

/**
 * @description One payload filter: `path` is a dot path into the parsed payload, or
 * `header:<name>` for an allow-listed header. `value` is a string for equals, not_equals and
 * prefix, a list of strings for `in`, and absent for exists and not_exists. A string, number or
 * boolean payload value is compared by its string form.
 * @public
 */
export interface ScheduledAgentJobWebhookFilter {
  readonly op: ScheduledAgentJobWebhookFilterOp;
  readonly path: string;
  readonly value: readonly string[] | string | undefined;
}

/**
 * @description Admission settings and signature configuration of a trigger: everything an update
 * can change (never the token or secret).
 * @public
 */
export interface ScheduledAgentJobWebhookTriggerConfig {
  readonly coalesceWindowMs: number;
  readonly deliveryIdHeader: string | null;
  readonly enabled: boolean;
  readonly filters: readonly ScheduledAgentJobWebhookFilter[];
  readonly maxInFlight: number;
  readonly rateLimitPerMinute: number;
  readonly signatureEncoding: ScheduledAgentJobWebhookSignatureEncoding;
  readonly signatureHeader: string;
  readonly signaturePreset: ScheduledAgentJobWebhookPreset;
  readonly timestampHeader: string | null;
  readonly timestampToleranceSeconds: number;
}

/**
 * @description The credentials a trigger is created or rotated with; the secret is already
 * encrypted.
 * @public
 */
export interface ScheduledAgentJobWebhookTriggerCredentials {
  readonly secretCiphertext: Buffer;
  readonly tokenHash: Buffer;
  readonly tokenPrefix: string;
}

/**
 * @description Fields to create a trigger.
 * @public
 */
export interface CreateScheduledAgentJobWebhookTriggerInput
  extends
    ScheduledAgentJobWebhookTriggerConfig,
    ScheduledAgentJobWebhookTriggerCredentials {
  readonly scheduledAgentJobId: string;
}

/**
 * @description The custom (non-`BaseRepository`) methods of
 * {@link ScheduledAgentJobWebhookTriggersRepository}.
 * @public
 */
export type ScheduledAgentJobWebhookTriggersRepositoryMethod =
  | 'createTrigger'
  | 'deleteTriggerForJob'
  | 'findTriggerByJobId'
  | 'findTriggerByTokenHash'
  | 'rotateTrigger'
  | 'updateTriggerConfig';

/**
 * @description One `Mock` per {@link ScheduledAgentJobWebhookTriggersRepositoryMethod}, typed with
 * the real signature.
 * @public
 */
export type ScheduledAgentJobWebhookTriggersRepositoryMethodMocks = {
  readonly [TMethod in ScheduledAgentJobWebhookTriggersRepositoryMethod]: Mock<
    ScheduledAgentJobWebhookTriggersRepository[TMethod]
  >;
};

/**
 * @description A {@link ScheduledAgentJobWebhookTriggersRepository} mock.
 * @public
 */
export interface ScheduledAgentJobWebhookTriggersRepositoryMock
  extends
    BaseRepositoryMock<
      ScheduledAgentJobWebhookTrigger,
      CreateModelInput<ScheduledAgentJobWebhookTrigger>
    >,
    ScheduledAgentJobWebhookTriggersRepositoryMethodMocks {}
