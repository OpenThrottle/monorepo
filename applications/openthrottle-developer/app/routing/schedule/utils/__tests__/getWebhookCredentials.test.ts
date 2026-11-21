import { describe, expect, test } from 'vitest';

import { getWebhookCredentials } from '../getWebhookCredentials';

describe('getWebhookCredentials', () => {
  test('returns the credentials of a create or rotate result', () => {
    expect(
      getWebhookCredentials({
        ok: true,
        webhookCredentials: { secret: 's', webhookPath: '/p' },
      }),
    ).toEqual({ secret: 's', webhookPath: '/p' });
  });

  test.each([
    undefined,
    null,
    'text',
    { ok: true },
    { webhookCredentials: null },
    { webhookCredentials: { secret: 's' } },
    { webhookCredentials: { secret: 1, webhookPath: '/p' } },
  ])('returns undefined for %j', (actionData) => {
    expect(getWebhookCredentials(actionData)).toBeUndefined();
  });
});
