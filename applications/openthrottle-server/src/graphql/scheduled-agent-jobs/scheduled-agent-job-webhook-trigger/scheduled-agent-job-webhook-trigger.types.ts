import type {
  ScheduledAgentJobWebhookTrigger,
  ScheduledAgentJobWebhookTriggerConfig,
} from '@openthrottle/nestjs-repositories-server';

import type { WebhookFilterDraft } from '../../../modules/agent-job-webhooks/filters/filters.types.ts';

/** @description Configuration fields as the GraphQL input carries them: every one optional. */
export interface WebhookTriggerConfigDraft {
  readonly coalesceWindowMs: number | null | undefined;
  readonly deliveryIdHeader: string | null | undefined;
  readonly enabled: boolean | null | undefined;
  readonly filters: readonly WebhookFilterDraft[] | null | undefined;
  readonly maxInFlight: number | null | undefined;
  readonly rateLimitPerMinute: number | null | undefined;
  readonly signatureEncoding: string | null | undefined;
  readonly signatureHeader: string | null | undefined;
  readonly signaturePreset: string | null | undefined;
  readonly timestampHeader: string | null | undefined;
  readonly timestampToleranceSeconds: number | null | undefined;
}

/** @description Outcome of resolving a draft into a complete, valid trigger config. */
export type WebhookTriggerConfigResult =
  | {
      readonly config: ScheduledAgentJobWebhookTriggerConfig;
      readonly ok: true;
    }
  | { readonly message: string; readonly ok: false };

/** @description A trigger plus the one-time plaintext token and secret, returned by create and rotate only. */
export interface WebhookTriggerReveal {
  readonly secret: string;
  readonly token: string;
  readonly trigger: ScheduledAgentJobWebhookTrigger;
}
