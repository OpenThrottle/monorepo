// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/robots[.]txt';

const { loader } = await import('../robots[.]txt');

describe('routes/robots[.]txt loader', () => {
  test('returns a text/plain Response disallowing all crawlers', async () => {
    const request = new Request('http://localhost/robots.txt');
    const args: Route.LoaderArgs = {
      context: createTestRouterContext(),
      params: {},
      pattern: '/robots.txt',
      request,
      url: new URL(request.url),
    };

    const response = loader(args);

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get('Content-Type')).toBe('text/plain');

    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /');
  });
});
