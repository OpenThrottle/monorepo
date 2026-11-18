import { AUTH_COOKIE_NAME } from '@openthrottle/react-router-auth';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/+types/root';

const { executeGraphql, executeGraphqlWithAuth } = vi.hoisted(() => {
  return { executeGraphql: vi.fn(), executeGraphqlWithAuth: vi.fn() };
});

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return { ...actual, executeGraphql, executeGraphqlWithAuth };
});

const { action, loader } = await import('../root');

const TOKEN = 'header.payload.signature';
const COOKIE_WITH_TOKEN = `${AUTH_COOKIE_NAME}=${TOKEN}`;

const routeArgs = (request: Request) => {
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/',
    request,
    url: new URL(request.url),
  };
};

const loaderArgs = (path: string, cookie = ''): Route.LoaderArgs => {
  const headers = new Headers(cookie === '' ? {} : { cookie });

  return routeArgs(new Request(`http://localhost${path}`, { headers }));
};

const actionArgs = (fields: Record<string, string>): Route.ActionArgs => {
  const body = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    body.set(key, value);
  });

  return routeArgs(new Request('http://localhost/', { body, method: 'POST' }));
};

const readLocation = (value: unknown): string | null => {
  return value instanceof Response ? value.headers.get('Location') : null;
};

describe('root.tsx', () => {
  beforeEach(() => {
    executeGraphql.mockReset();
    executeGraphqlWithAuth.mockReset();
  });

  describe('loader with no user', () => {
    test('sends a protected deep link to /auth carrying it as redirectUrl', async () => {
      const result = await loader(loaderArgs('/users/abc?tab=roles'));

      expect(readLocation(result)).toBe(
        '/auth?redirectUrl=%2Fusers%2Fabc%3Ftab%3Droles',
      );
    });

    test('clears a cookie the server rejected', async () => {
      executeGraphqlWithAuth.mockResolvedValue({ me: null });

      const result = await loader(loaderArgs('/users', COOKIE_WITH_TOKEN));

      expect(readLocation(result)).toBe('/auth?redirectUrl=%2Fusers');
      expect(result instanceof Response ? result.headers.get('Set-Cookie') : null).toContain('Max-Age=0'); // prettier-ignore
    });

    test('lets /auth render instead of redirecting it', async () => {
      executeGraphqlWithAuth.mockResolvedValue({});

      const result = await loader(loaderArgs('/auth?redirectUrl=%2Fusers'));

      expect(result).not.toBeInstanceOf(Response);
    });
  });

  describe('login action', () => {
    test('lands on a safe redirectUrl', async () => {
      executeGraphql.mockResolvedValue({ login: { accessToken: 'jwt' } });

      const result = await action(actionArgs({ email: 'a@b.test', intent: 'login', password: 'pw', redirectUrl: '/users/abc' })); // prettier-ignore

      expect(readLocation(result)).toBe('/users/abc');
    });

    test('falls back to /dashboard for an unsafe redirectUrl', async () => {
      executeGraphql.mockResolvedValue({ login: { accessToken: 'jwt' } });

      const result = await action(actionArgs({ email: 'a@b.test', intent: 'login', password: 'pw', redirectUrl: '//evil.test' })); // prettier-ignore

      expect(readLocation(result)).toBe('/dashboard');
    });

    test('signout still goes to bare /', async () => {
      executeGraphqlWithAuth.mockResolvedValue({});

      const result = await action(actionArgs({ intent: 'signout' }));

      expect(readLocation(result)).toBe('/');
    });
  });
});
