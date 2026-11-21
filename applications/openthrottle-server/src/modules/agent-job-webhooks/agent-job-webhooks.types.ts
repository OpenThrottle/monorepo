import type {
  ScheduledAgentJobWebhookDeliveryStatus,
  ScheduledAgentJobWebhookRejectReason,
} from '@openthrottle/nestjs-repositories-server';

/**
 * @description The answer ingress gives a sender: an HTTP status plus a small JSON body. Every
 * rejection uses the same shape so a probe learns nothing from the body beyond the status.
 */
export interface WebhookIngressResponse {
  readonly body: WebhookIngressResponseBody;
  readonly httpStatus: number;
}

/** @description The JSON bodies ingress answers with. */
export type WebhookIngressResponseBody =
  | {
      readonly reason: ScheduledAgentJobWebhookRejectReason;
      readonly status: 'rejected';
    }
  | { readonly runId: string; readonly status: 'accepted' }
  | { readonly runId: string | null; readonly status: 'coalesced' }
  | {
      readonly status: Exclude<
        ScheduledAgentJobWebhookDeliveryStatus,
        'accepted' | 'coalesced' | 'rejected'
      >;
    }
  | { readonly status: 'not_found' }
  | { readonly status: 'unavailable' };

/**
 * @description One inbound request as the controller hands it to the service: everything the
 * pipeline needs, with the framework request already unpacked.
 */
export interface WebhookIngressRequest {
  readonly contentType: string | undefined;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly rawBody: Buffer | undefined;
  readonly token: string;
}
