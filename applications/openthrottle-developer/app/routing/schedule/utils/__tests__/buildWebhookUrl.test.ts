import { describe, expect, test } from 'vitest';

import { buildWebhookUrl } from '../buildWebhookUrl';

describe('buildWebhookUrl', () => {
  test('joins the public origin and the ingress path', () => {
    expect(
      buildWebhookUrl('https://api.example.test', '/webhooks/agent-jobs/t'),
    ).toBe('https://api.example.test/webhooks/agent-jobs/t');
  });

  test('tolerates a trailing slash on the origin and a missing one on the path', () => {
    expect(
      buildWebhookUrl('https://api.example.test/', 'webhooks/agent-jobs/t'),
    ).toBe('https://api.example.test/webhooks/agent-jobs/t');
  });

  test('falls back to the bare path with no origin', () => {
    expect(buildWebhookUrl(undefined, '/webhooks/agent-jobs/t')).toBe(
      '/webhooks/agent-jobs/t',
    );
  });
});
