import { describe, expect, test } from 'vitest';

import { isWebhookIntent } from '../runWebhookIntent';

describe('isWebhookIntent', () => {
  test('accepts every webhook intent', () => {
    expect(isWebhookIntent('webhook-create')).toBe(true);
    expect(isWebhookIntent('webhook-delete')).toBe(true);
    expect(isWebhookIntent('webhook-rotate')).toBe(true);
    expect(isWebhookIntent('webhook-update')).toBe(true);
  });

  test('rejects other intents and missing values', () => {
    expect(isWebhookIntent('run-now')).toBe(false);
    expect(isWebhookIntent('webhook')).toBe(false);
    expect(isWebhookIntent(null)).toBe(false);
  });
});
