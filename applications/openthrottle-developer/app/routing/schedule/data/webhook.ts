import type { BadgeProps } from '@openthrottle/react-router-shadcn';

/**
 * @description The webhook trigger's fixed vocabularies and limits. The values are the server's
 * strings and ranges (docs/openthrottle/webhook-triggered-agent-jobs.md); the server validates them
 * again, so these only drive the pickers, the defaults and the form's min/max attributes.
 */
export const WEBHOOK_PRESET = {
  custom: 'custom',
  generic: 'generic',
  github: 'github',
} as const;

export type WebhookPresetKey = keyof typeof WEBHOOK_PRESET;
export type WebhookPresetValue = (typeof WEBHOOK_PRESET)[WebhookPresetKey];

export interface WebhookOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

export const WEBHOOK_PRESET_OPTIONS: readonly WebhookOption<WebhookPresetValue>[] =
  [
    { label: `Generic (OpenThrottle signing)`, value: WEBHOOK_PRESET.generic },
    { label: `GitHub`, value: WEBHOOK_PRESET.github },
    { label: `Custom`, value: WEBHOOK_PRESET.custom },
  ];

export const WEBHOOK_ENCODING_OPTIONS: readonly WebhookOption<
  'base64' | 'hex'
>[] = [
  { label: `Hex`, value: 'hex' },
  { label: `Base64`, value: 'base64' },
];

export const WEBHOOK_FILTER_OP = {
  equals: 'equals',
  exists: 'exists',
  in: 'in',
  notEquals: 'not_equals',
  notExists: 'not_exists',
  prefix: 'prefix',
} as const;

export type WebhookFilterOpKey = keyof typeof WEBHOOK_FILTER_OP;
export type WebhookFilterOpValue =
  (typeof WEBHOOK_FILTER_OP)[WebhookFilterOpKey];

export const WEBHOOK_FILTER_OP_OPTIONS: readonly WebhookOption<string>[] = [
  { label: `equals`, value: WEBHOOK_FILTER_OP.equals },
  { label: `does not equal`, value: WEBHOOK_FILTER_OP.notEquals },
  { label: `is one of`, value: WEBHOOK_FILTER_OP.in },
  { label: `exists`, value: WEBHOOK_FILTER_OP.exists },
  { label: `does not exist`, value: WEBHOOK_FILTER_OP.notExists },
  { label: `starts with`, value: WEBHOOK_FILTER_OP.prefix },
];

/** Ops that take no value. */
export const WEBHOOK_FILTER_NO_VALUE_OPS: readonly string[] = [
  WEBHOOK_FILTER_OP.exists,
  WEBHOOK_FILTER_OP.notExists,
];

export const WEBHOOK_LIMITS = {
  coalesceMaxSeconds: 3600,
  defaultCoalesceSeconds: 0,
  defaultMaxInFlight: 3,
  defaultRateLimitPerMinute: 30,
  defaultToleranceSeconds: 300,
  filterValuesMax: 32,
  filtersMax: 16,
  maxInFlightMax: 10,
  rateLimitMax: 120,
  toleranceMaxSeconds: 900,
  toleranceMinSeconds: 30,
} as const;

export type WebhookLimitsKey = keyof typeof WEBHOOK_LIMITS;
export type WebhookLimitsValue = (typeof WEBHOOK_LIMITS)[WebhookLimitsKey];

/** Badge hue per delivery status: accepted is green, a rejection red, everything the server chose to skip amber. */
export const WEBHOOK_DELIVERY_STATUS_COLOR: Record<
  string,
  BadgeProps['color']
> = {
  accepted: 'green',
  coalesced: 'slate',
  deduplicated: 'slate',
  filtered: 'amber',
  queue_full: 'amber',
  rate_limited: 'amber',
  rejected: 'red',
};

export const WEBHOOK_DELIVERY_STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  coalesced: 'Coalesced',
  deduplicated: 'Duplicate',
  filtered: 'Filtered out',
  queue_full: 'Queue full',
  rate_limited: 'Rate limited',
  rejected: 'Rejected',
};

export const WEBHOOK_REJECT_REASON_LABEL: Record<string, string> = {
  bad_signature: `The signature did not match the secret.`,
  invalid_json: `The body was not valid JSON.`,
  missing_timestamp: `The timestamp header was missing.`,
  payload_too_large: `The body was over the 1 MiB limit.`,
  stale_timestamp: `The timestamp was outside the tolerance window.`,
  unsupported_media_type: `The content type was not application/json.`,
};

/** The fixed explanation for a status that carries no reject reason of its own. */
export const WEBHOOK_DELIVERY_STATUS_REASON: Record<string, string> = {
  coalesced: `Another delivery inside the coalesce window already started a run.`,
  deduplicated: `This delivery id or body was already seen in the last 7 days.`,
  filtered: `A filter did not match the payload.`,
  queue_full: `The job already has the most webhook runs in flight.`,
  rate_limited: `The trigger's per-minute rate limit was reached.`,
};
