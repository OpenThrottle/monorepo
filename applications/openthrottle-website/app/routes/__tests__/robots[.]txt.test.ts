import { describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/robots[.]txt';

// The robots.txt body/format (crawler allowances, sitemap advertisement) lives
// in — and is tested with — buildRobotsResponse in
// @openthrottle/react-router-utils. Here we verify the route's own
// responsibility: advertising this site's sitemap path and delegating to the
// shared helper.
const buildRobotsResponse = vi.fn(
  (_options: { sitemapPath: string }) =>
    new Response('User-agent: *\nAllow: /\n', {
      headers: { 'Content-Type': 'text/plain' },
    }),
);

vi.mock('@openthrottle/react-router-utils', () => ({ buildRobotsResponse }));

const { loader } = await import('../robots[.]txt');

const loaderArgs: Route.LoaderArgs = {
  context: createTestRouterContext(),
  params: {},
  pattern: '/robots.txt',
  request: new Request('http://localhost/robots.txt'),
  url: new URL('http://localhost/robots.txt'),
};

describe('routes/robots[.]txt.tsx', () => {
  test('advertises the sitemap and delegates to the shared helper', () => {
    const response = loader(loaderArgs);

    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(buildRobotsResponse).toHaveBeenCalledTimes(1);
    expect(buildRobotsResponse).toHaveBeenCalledWith({
      sitemapPath: '/sitemap.xml',
    });
  });
});
