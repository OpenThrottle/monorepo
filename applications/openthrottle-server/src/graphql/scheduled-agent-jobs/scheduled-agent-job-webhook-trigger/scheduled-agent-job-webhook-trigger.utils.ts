import type {
  ScheduledAgentJobWebhookPreset,
  ScheduledAgentJobWebhookSignatureEncoding,
  ScheduledAgentJobWebhookTriggerConfig,
} from '@openthrottle/nestjs-repositories-server';
import {
  SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS,
  SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS,
  SCHEDULED_AGENT_JOB_WEBHOOK_PRESETS,
} from '@openthrottle/nestjs-repositories-server';

import { WEBHOOK_PRESET_HEADERS } from '../../../modules/agent-job-webhooks/agent-job-webhooks.constants.ts';
import { validateWebhookFilters } from '../../../modules/agent-job-webhooks/filters/filters.utils.ts';
import type {
  WebhookTriggerConfigDraft,
  WebhookTriggerConfigResult,
} from './scheduled-agent-job-webhook-trigger.types.ts';

const HEADER_NAME = /^[A-Za-z0-9-]{1,100}$/;

const isPreset = (value: string): value is ScheduledAgentJobWebhookPreset => {
  return SCHEDULED_AGENT_JOB_WEBHOOK_PRESETS.some((preset) => preset === value);
};

const isEncoding = (
  value: string,
): value is ScheduledAgentJobWebhookSignatureEncoding => {
  return value === 'hex' || value === 'base64';
};

const inRange = (
  value: number,
  range: { readonly max: number; readonly min: number },
): boolean => {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
};

const rangeMessage = (
  label: string,
  range: { readonly max: number; readonly min: number },
): string => {
  return `${label} must be an integer from ${range.min} to ${range.max}`;
};

/**
 * @description Resolves a create/update draft into a full config. `base` is the existing config on
 * update (an omitted field keeps its value) and null on create (an omitted field takes the
 * default). The generic and github presets fix their own headers; custom needs a valid signature
 * header. Every range matches the table's CHECK constraints.
 */
export const resolveWebhookTriggerConfig = (
  draft: WebhookTriggerConfigDraft,
  base: ScheduledAgentJobWebhookTriggerConfig | null,
): WebhookTriggerConfigResult => {
  const presetName =
    draft.signaturePreset ?? base?.signaturePreset ?? 'generic';

  if (!isPreset(presetName)) {
    return {
      message: `signaturePreset must be generic, github or custom`,
      ok: false,
    };
  }

  const coalesceWindowMs = draft.coalesceWindowMs ?? base?.coalesceWindowMs ?? SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS.coalesceWindowMs; // prettier-ignore
  const maxInFlight = draft.maxInFlight ?? base?.maxInFlight ?? SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS.maxInFlight; // prettier-ignore
  const rateLimitPerMinute = draft.rateLimitPerMinute ?? base?.rateLimitPerMinute ?? SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS.ratePerMinute; // prettier-ignore
  const tolerance = draft.timestampToleranceSeconds ?? base?.timestampToleranceSeconds ?? SCHEDULED_AGENT_JOB_WEBHOOK_DEFAULTS.timestampToleranceSeconds; // prettier-ignore

  const limits = SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS;
  const rangeError =
    (!inRange(coalesceWindowMs, limits.coalesceWindowMs) && rangeMessage('coalesceWindowMs', limits.coalesceWindowMs)) ||
    (!inRange(maxInFlight, limits.maxInFlight) && rangeMessage('maxInFlight', limits.maxInFlight)) ||
    (!inRange(rateLimitPerMinute, limits.ratePerMinute) && rangeMessage('rateLimitPerMinute', limits.ratePerMinute)) ||
    (!inRange(tolerance, limits.timestampToleranceSeconds) && rangeMessage('timestampToleranceSeconds', limits.timestampToleranceSeconds)); // prettier-ignore

  if (rangeError) {
    return { message: rangeError, ok: false };
  }

  let filters = base?.filters ?? [];

  if (draft.filters !== null && draft.filters !== undefined) {
    const validated = validateWebhookFilters(draft.filters);

    if (!validated.ok) {
      return { message: validated.message, ok: false };
    }

    filters = validated.filters;
  }

  const shared = {
    coalesceWindowMs,
    enabled: draft.enabled ?? base?.enabled ?? true,
    filters,
    maxInFlight,
    rateLimitPerMinute,
    timestampToleranceSeconds: tolerance,
  };

  if (presetName === 'generic' || presetName === 'github') {
    const fixed = WEBHOOK_PRESET_HEADERS[presetName];

    return {
      config: {
        ...shared,
        deliveryIdHeader: fixed.deliveryIdHeader,
        signatureEncoding: 'hex',
        signatureHeader: fixed.signatureHeader,
        signaturePreset: presetName,
        timestampHeader: fixed.timestampHeader,
      },
      ok: true,
    };
  }

  return resolveCustomConfig(draft, base, shared);
};

/** @description The custom preset: header names and encoding come from the user, so each is validated. */
const resolveCustomConfig = (
  draft: WebhookTriggerConfigDraft,
  base: ScheduledAgentJobWebhookTriggerConfig | null,
  shared: Pick<
    ScheduledAgentJobWebhookTriggerConfig,
    | 'coalesceWindowMs'
    | 'enabled'
    | 'filters'
    | 'maxInFlight'
    | 'rateLimitPerMinute'
    | 'timestampToleranceSeconds'
  >,
): WebhookTriggerConfigResult => {
  const baseCustom = base?.signaturePreset === 'custom' ? base : null;
  const signatureHeader = (
    draft.signatureHeader ??
    baseCustom?.signatureHeader ??
    ''
  ).trim();
  const encoding =
    draft.signatureEncoding ?? baseCustom?.signatureEncoding ?? 'hex';
  const timestampHeader = (
    draft.timestampHeader ??
    baseCustom?.timestampHeader ??
    ''
  ).trim();
  const deliveryIdHeader = (
    draft.deliveryIdHeader ??
    baseCustom?.deliveryIdHeader ??
    ''
  ).trim();

  if (!HEADER_NAME.test(signatureHeader)) {
    return {
      message: `A custom preset needs a signatureHeader (letters, digits and hyphens)`,
      ok: false,
    };
  }

  if (!isEncoding(encoding)) {
    return { message: `signatureEncoding must be hex or base64`, ok: false };
  }

  for (const [label, name] of [
    ['timestampHeader', timestampHeader],
    ['deliveryIdHeader', deliveryIdHeader],
  ] as const) {
    // prettier-ignore
    if (name !== '' && !HEADER_NAME.test(name)) {
      return { message: `${label} must be a header name (letters, digits and hyphens)`, ok: false };
    }
  }

  return {
    config: {
      ...shared,
      deliveryIdHeader: deliveryIdHeader === '' ? null : deliveryIdHeader,
      signatureEncoding: encoding,
      signatureHeader,
      signaturePreset: 'custom',
      timestampHeader: timestampHeader === '' ? null : timestampHeader,
    },
    ok: true,
  };
};
