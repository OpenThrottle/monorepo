import { describe, expect, it } from 'vitest';

import type { WebhookTriggerConfigDraft } from './scheduled-agent-job-webhook-trigger.types.ts';
import { resolveWebhookTriggerConfig } from './scheduled-agent-job-webhook-trigger.utils.ts';

const empty: WebhookTriggerConfigDraft = {
  coalesceWindowMs: undefined,
  deliveryIdHeader: undefined,
  enabled: undefined,
  filters: undefined,
  maxInFlight: undefined,
  rateLimitPerMinute: undefined,
  signatureEncoding: undefined,
  signatureHeader: undefined,
  signaturePreset: undefined,
  timestampHeader: undefined,
  timestampToleranceSeconds: undefined,
};

describe('resolveWebhookTriggerConfig', () => {
  it('defaults to the generic preset with the documented caps', () => {
    const result = resolveWebhookTriggerConfig(empty, null);

    expect(result).toStrictEqual({
      config: {
        coalesceWindowMs: 0,
        deliveryIdHeader: 'X-OT-Webhook-Id',
        enabled: true,
        filters: [],
        maxInFlight: 3,
        rateLimitPerMinute: 30,
        signatureEncoding: 'hex',
        signatureHeader: 'X-OT-Signature',
        signaturePreset: 'generic',
        timestampHeader: 'X-OT-Timestamp',
        timestampToleranceSeconds: 300,
      },
      ok: true,
    });
  });

  it('fixes the github preset headers and drops the timestamp', () => {
    const result = resolveWebhookTriggerConfig(
      { ...empty, signatureHeader: 'ignored', signaturePreset: 'github' },
      null,
    );

    expect(result.ok && result.config).toMatchObject({
      deliveryIdHeader: 'X-GitHub-Delivery',
      signatureHeader: 'X-Hub-Signature-256',
      timestampHeader: null,
    });
  });

  it('takes the custom header configuration from the draft', () => {
    const result = resolveWebhookTriggerConfig(
      {
        ...empty,
        deliveryIdHeader: 'X-Id',
        signatureEncoding: 'base64',
        signatureHeader: 'X-Sig',
        signaturePreset: 'custom',
        timestampHeader: 'X-Ts',
      },
      null,
    );

    expect(result.ok && result.config).toMatchObject({
      deliveryIdHeader: 'X-Id',
      signatureEncoding: 'base64',
      signatureHeader: 'X-Sig',
      signaturePreset: 'custom',
      timestampHeader: 'X-Ts',
    });
  });

  it.each([
    ['an unknown preset', { signaturePreset: 'nope' }],
    [
      'a custom preset without a signature header',
      { signaturePreset: 'custom' },
    ],
    [
      'a custom signature header that is not a header name',
      { signatureHeader: 'bad header!', signaturePreset: 'custom' },
    ],
    [
      'an unknown encoding',
      {
        signatureEncoding: 'rot13',
        signatureHeader: 'X-S',
        signaturePreset: 'custom',
      },
    ],
    ['a tolerance below 30', { timestampToleranceSeconds: 29 }],
    ['a tolerance above 900', { timestampToleranceSeconds: 901 }],
    ['a coalesce window above an hour', { coalesceWindowMs: 3_600_001 }],
    ['a negative coalesce window', { coalesceWindowMs: -1 }],
    ['a rate limit of 0', { rateLimitPerMinute: 0 }],
    ['a rate limit above 120', { rateLimitPerMinute: 121 }],
    ['a queue cap of 0', { maxInFlight: 0 }],
    ['a queue cap above 10', { maxInFlight: 11 }],
    ['a fractional cap', { maxInFlight: 2.5 }],
    [
      'a regex filter',
      { filters: [{ op: 'regex', path: 'a', value: '.*', values: null }] },
    ],
  ])('rejects %s', (_label, patch) => {
    expect(resolveWebhookTriggerConfig({ ...empty, ...patch }, null).ok).toBe(
      false,
    );
  });

  it('accepts the range boundaries', () => {
    const result = resolveWebhookTriggerConfig(
      {
        ...empty,
        coalesceWindowMs: 3_600_000,
        maxInFlight: 10,
        rateLimitPerMinute: 120,
        timestampToleranceSeconds: 900,
      },
      null,
    );

    expect(result.ok).toBe(true);
  });

  it('on update, keeps every omitted field of the existing config', () => {
    const created = resolveWebhookTriggerConfig(
      { ...empty, coalesceWindowMs: 5000, maxInFlight: 7 },
      null,
    );
    if (!created.ok) {
      throw new Error('setup failed');
    }

    const updated = resolveWebhookTriggerConfig(
      { ...empty, enabled: false },
      created.config,
    );

    expect(updated.ok && updated.config).toMatchObject({
      coalesceWindowMs: 5000,
      enabled: false,
      maxInFlight: 7,
    });
  });
});
