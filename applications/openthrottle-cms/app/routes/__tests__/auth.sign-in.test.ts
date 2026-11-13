import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/auth.sign-in';
import { CmsLoginDocument } from '~/__generated__/graphql';
import { AUTH_COPY } from '~/routing/auth/data/data.copy';

const fetchPublicGraphql = vi.fn();

vi.mock('~/global/utils/graphql.server', () => {
  return { fetchAuthGraphql: vi.fn(), fetchPublicGraphql };
});

const { action, loader } = await import('../auth.sign-in');

const TOKEN = 'header.payload.signature';

const routeArgs = (request: Request) => {
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/auth/sign-in',
    request,
    url: new URL(request.url),
  };
};

const buildLoaderArgs = (search: string, cookie = ''): Route.LoaderArgs => {
  const headers = new Headers(cookie === '' ? {} : { cookie });

  return routeArgs(new Request(`http://localhost/auth/sign-in${search}`, { headers })); // prettier-ignore
};

const buildActionArgs = (fields: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    body.set(key, value);
  });

  return routeArgs(new Request('http://localhost/auth/sign-in', { body, method: 'POST' })); // prettier-ignore
};

/** The data() payload of an action result that did not redirect. */
const readError = (result: unknown): unknown => {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    const { data } = result;

    return typeof data === 'object' && data !== null && 'error' in data ? data.error : undefined; // prettier-ignore
  }

  return undefined;
};

describe('routes/auth.sign-in', () => {
  beforeEach(() => {
    fetchPublicGraphql.mockReset();
  });

  describe('loader', () => {
    test('passes on a safe return path', async () => {
      await expect(loader(buildLoaderArgs('?redirectTo=%2Ffragments%2Fabc'))).resolves.toEqual({ redirectTo: '/fragments/abc' }); // prettier-ignore
    });

    test('drops an off-site return path', async () => {
      await expect(loader(buildLoaderArgs('?redirectTo=%2F%2Fevil.test'))).resolves.toEqual({ redirectTo: '/' }); // prettier-ignore
    });

    test('sends someone already signed in straight back', async () => {
      const result = await loader(buildLoaderArgs('?redirectTo=%2Ffragments%2Fabc', `openthrottle-cms_auth_token=${TOKEN}`)); // prettier-ignore

      expect(result).toBeInstanceOf(Response);
      expect(result instanceof Response && result.headers.get('Location')).toBe('/fragments/abc'); // prettier-ignore
    });
  });

  describe('action', () => {
    test('logs in, sets the CMS auth cookie and returns to redirectTo', async () => {
      fetchPublicGraphql.mockResolvedValue({ login: { accessToken: TOKEN } });

      const result = await action(buildActionArgs({ email: ' editor@example.test ', password: 'pw', redirectTo: '/fragments/abc' })); // prettier-ignore

      expect(fetchPublicGraphql).toHaveBeenCalledWith(CmsLoginDocument, { input: { email: 'editor@example.test', password: 'pw' } }); // prettier-ignore
      expect(result).toBeInstanceOf(Response);
      const response = result instanceof Response ? result : undefined;
      expect(response?.headers.get('Location')).toBe('/fragments/abc');
      expect(response?.headers.get('Set-Cookie')).toContain(`_auth_token=${TOKEN}`); // prettier-ignore
    });

    test('refuses a missing password without calling the server', async () => {
      const result = await action(buildActionArgs({ email: 'editor@example.test', password: '' })); // prettier-ignore

      expect(readError(result)).toBe(AUTH_COPY.missingFields);
      expect(fetchPublicGraphql).not.toHaveBeenCalled();
    });

    test('reports a refused login without detail', async () => {
      fetchPublicGraphql.mockRejectedValue(new Error('Invalid credentials'));
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const result = await action(buildActionArgs({ email: 'editor@example.test', password: 'wrong' })); // prettier-ignore

      expect(readError(result)).toBe(AUTH_COPY.failed);
    });
  });
});
