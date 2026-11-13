import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/auth.sign-out';
import { CmsSignoutDocument } from '~/__generated__/graphql';

const fetchAuthGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => {
  return { fetchAuthGraphql, fetchPublicGraphql: vi.fn() };
});

const { loader } = await import('../auth.sign-out');

const buildLoaderArgs = (): Route.LoaderArgs => {
  const request = new Request('http://localhost/auth/sign-out');

  return { context: createTestRouterContext(), params: {}, pattern: '/auth/sign-out', request, url: new URL(request.url) }; // prettier-ignore
};

describe('routes/auth.sign-out', () => {
  beforeEach(() => {
    fetchAuthGraphql.mockReset();
  });

  test('signs out on the server, clears the cookie and goes home', async () => {
    fetchAuthGraphql.mockResolvedValue({ signout: { success: true } });
    const args = buildLoaderArgs();

    const response = await loader(args);

    expect(fetchAuthGraphql).toHaveBeenCalledWith(args.request, CmsSignoutDocument); // prettier-ignore
    expect(response.headers.get('Location')).toBe('/');
    expect(response.headers.get('Set-Cookie')).toMatch(/_auth_token=; .*Max-Age=0/); // prettier-ignore
  });

  test('still clears the cookie when the server call fails', async () => {
    fetchAuthGraphql.mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await loader(buildLoaderArgs());

    expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });
});
