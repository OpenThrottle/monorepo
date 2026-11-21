/**
 * @description Constants of the webhook ingress. See docs/openthrottle/webhook-triggered-agent-jobs.md.
 */

/** Environment variable holding the AES-256-GCM key (32 bytes, base64) that protects HMAC secrets at rest. */
export const WEBHOOK_SECRET_ENCRYPTION_KEY_ENV = `WEBHOOK_SECRET_ENCRYPTION_KEY`;

/** Raw body cap: 1 MiB, enforced on `rawBody.length` so the limit is ours and not parser config. */
export const WEBHOOK_MAX_BODY_BYTES = 1_048_576;

/** Length in bytes of the URL token and of the HMAC secret before encoding. */
export const WEBHOOK_RANDOM_BYTES = 32;

/** Characters of the URL token kept as the display prefix. */
export const WEBHOOK_TOKEN_PREFIX_LENGTH = 6;

/** Path of the ingress route (the token is appended). */
export const WEBHOOK_INGRESS_PATH = '/webhooks/agent-jobs';

/** Trailing window the per-trigger rate cap counts accepted deliveries over. */
export const WEBHOOK_RATE_WINDOW_MS = 60_000;

/** Longest stored header value; anything longer is truncated before it is logged or filtered on. */
export const WEBHOOK_HEADER_VALUE_MAX_LENGTH = 256;

/** Longest accepted dedupe key taken from a sender's delivery id header. */
export const WEBHOOK_DEDUPE_KEY_MAX_LENGTH = 200;

/** Default and maximum size of a delivery log page. */
export const WEBHOOK_DELIVERIES_DEFAULT_LIMIT = 50;
export const WEBHOOK_DELIVERIES_MAX_LIMIT = 200;

/**
 * Request headers that are logged on the delivery row and addressable by a `header:<name>`
 * filter. Lowercase. The signature and authorization headers are deliberately absent. A trigger's
 * configured delivery-id and timestamp headers are allowed on top of these.
 */
export const WEBHOOK_ALLOWED_HEADERS: readonly string[] = [
  'content-type',
  'user-agent',
  'x-github-delivery',
  'x-github-event',
  'x-ot-event',
  'x-ot-timestamp',
  'x-ot-webhook-id',
];

/** The fixed header names of the `generic` and `github` presets. */
export const WEBHOOK_PRESET_HEADERS = {
  generic: {
    deliveryIdHeader: 'X-OT-Webhook-Id',
    signatureHeader: 'X-OT-Signature',
    timestampHeader: 'X-OT-Timestamp',
  },
  github: {
    deliveryIdHeader: 'X-GitHub-Delivery',
    signatureHeader: 'X-Hub-Signature-256',
    timestampHeader: null,
  },
} as const;
