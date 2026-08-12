// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import { loader } from '../robots[.]txt';
import type { Route } from '@/app/routes/+types/robots[.]txt';

describe('routes/robots[.]txt.tsx loader', () => {
  test('responds with a noindex robots.txt for this authenticated app', async () => {
    const response = loader(
      createLoaderArgs<Route.LoaderArgs>({
        url: 'http://localhost/robots.txt',
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    const body = await response.text();
    expect(body).toBe('User-agent: *\nDisallow: /\n');
  });
});
