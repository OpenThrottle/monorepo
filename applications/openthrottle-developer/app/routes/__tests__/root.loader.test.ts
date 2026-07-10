// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as graphqlWithAuth from '@openthrottle/react-router-graphql';
import { buildAuthCookie } from '@openthrottle/react-router-auth';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import {
  GetMyUserDocument,
  GetRootHealthDocument,
} from '~/__generated__/graphql';
import { loader } from '../../root';
import type { Route } from '@/app/+types/root';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();
  return {
    ...actual,
    executeGraphqlWithAuth: vi.fn(),
  };
});

// The loader reads getEnvironment() for the server-only API_URL_INTERNAL
// (diagnostics) and getPublicEnv() for the client-serialized `env`. Neither the
// node nor jsdom test env populates those keys, so stub both accessors with a
// deterministic env. The public stub omits server-only keys (API_URL_INTERNAL)
// to mirror what actually ships to window.env. All other exports
// (FEATURE_BETA_PREVIEW, APP_URL, etc.) stay real — FEATURE_BETA_PREVIEW defaults
// to true here, which is the running app's behavior under test.
const PUBLIC_ENV = {
  API_URL_EXTERNAL: 'http://localhost:6021',
  APP_ENV: 'test',
  APP_NAME: 'openthrottle-developer',
  APP_NAME_SHORT: 'ot-dev',
  APP_URL: 'http://localhost:6020',
  APP_URL_ADMIN: 'http://localhost:6010',
  APP_URL_CMS: 'http://localhost:6030',
  APP_URL_DEVELOPER: 'http://localhost:6020',
  APP_URL_EMAIL: 'http://localhost:6040',
  APP_URL_SERVER: 'http://localhost:6021',
  APP_URL_WEBSITE: 'http://localhost:6050',
  APP_VERSION: '0.0.0',
  NODE_ENV: 'test',
  ROLLBAR_TOKEN: 'test-token',
} as const;

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();
  return {
    ...actual,
    getEnvironment: () => ({
      ...PUBLIC_ENV,
      API_URL_INTERNAL: 'http://localhost:6021',
    }),
    getPublicEnv: () => ({ ...PUBLIC_ENV }),
  };
});

const mockExecuteGraphqlWithAuth = vi.mocked(
  graphqlWithAuth.executeGraphqlWithAuth,
);

const HEALTHY = {
  api: 'healthy',
  database: 'healthy',
  redis: 'healthy',
  websocket: 'healthy',
};

/** A real cookie header carrying the auth JWT under the app's cookie name. */
const COOKIE_WITH_TOKEN = buildAuthCookie('jwt-token-value');

/**
 * Build root loader args. `url` is supplied by app middleware in production; in
 * tests we pass it explicitly alongside a matching Request (mirrors the other
 * `*.loader.test.ts` helpers in this folder).
 */
const loaderArgs = (
  url: string,
  options?: { readonly cookie?: string },
): Route.LoaderArgs => ({
  ...createLoaderArgs<Route.LoaderArgs>({
    headers: options?.cookie ? { cookie: options.cookie } : undefined,
    url,
  }),
  // The root loader reads `url` (supplied by app middleware in production).
  url: new URL(url),
});

/** Narrows a loader result to a `Response` (redirect) without a cast. */
function assertIsResponse(value: unknown): asserts value is Response {
  if (!(value instanceof Response)) {
    throw new Error('Expected loader result to be a Response');
  }
}

/** Narrows a loader result to the non-`Response` (data) branch without a cast. */
function assertIsData<T>(value: T): asserts value is Exclude<T, Response> {
  if (value instanceof Response) {
    throw new Error('Expected loader result not to be a Response');
  }
}

/**
 * Sequence the two GraphQL calls the loader makes when a token is present:
 * 1) GetRootHealth (health poll), 2) GetMyUser (session user).
 */
const resolveHealthThenUser = (user: unknown): void => {
  mockExecuteGraphqlWithAuth.mockImplementation(async (_request, document) => {
    if (document === GetRootHealthDocument) {
      return { serverHealth: HEALTHY };
    }
    if (document === GetMyUserDocument) {
      return { me: user };
    }
    throw new Error('unexpected GraphQL document');
  });
};

describe('root loader: token gate + protected-prefix redirect', () => {
  beforeEach(() => {
    mockExecuteGraphqlWithAuth.mockReset();
  });

  test('redirects to /auth for a protected path with no token (no GraphQL call)', async () => {
    const result = await loader(loaderArgs('http://localhost/dashboard'));

    expect(result).toBeInstanceOf(Response);
    assertIsResponse(result);
    expect(result.status).toBe(302);
    expect(result.headers.get('location')).toBe('/auth');
    expect(mockExecuteGraphqlWithAuth).not.toHaveBeenCalled();
  });

  test('redirects nested protected paths (prefix match) to /auth when no token', async () => {
    const result = await loader(
      loaderArgs('http://localhost/plans/abc/tasks/def'),
    );

    expect(result).toBeInstanceOf(Response);
    assertIsResponse(result);
    expect(result.headers.get('location')).toBe('/auth');
  });

  test('does not redirect an unprotected path when no token, and skips the user query', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({ serverHealth: HEALTHY });

    const result = await loader(loaderArgs('http://localhost/auth'));

    expect(result).not.toBeInstanceOf(Response);
    assertIsData(result);
    const data = result;
    expect(data.user).toBeNull();
    // No token → userLoadOk is true (not an error, simply logged out).
    expect(data.userLoadOk).toBe(true);
    // Health is polled, but the `me` query is never attempted without a token.
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledTimes(1);
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.anything(),
      GetRootHealthDocument,
    );
  });

  test('does not consider a path protected when the prefix is only a partial segment match', async () => {
    mockExecuteGraphqlWithAuth.mockResolvedValue({ serverHealth: HEALTHY });

    // `/plansomething` shares a string prefix with `/plans` but is not protected.
    const result = await loader(loaderArgs('http://localhost/plansomething'));

    expect(result).not.toBeInstanceOf(Response);
  });

  test('loads the session user when a token is present', async () => {
    const user = { email: 'pilot@example.com', id: 'u1' };
    resolveHealthThenUser(user);

    const result = await loader(
      loaderArgs('http://localhost/dashboard', { cookie: COOKIE_WITH_TOKEN }),
    );

    expect(result).not.toBeInstanceOf(Response);
    assertIsData(result);
    const data = result;
    expect(data.user).toEqual(user);
    expect(data.userLoadOk).toBe(true);
    expect(data.serverHealth).toEqual(HEALTHY);
    expect(mockExecuteGraphqlWithAuth).toHaveBeenCalledWith(
      expect.anything(),
      GetMyUserDocument,
    );
  });

  test('redirects a protected path to /auth when the token is present but `me` resolves null', async () => {
    resolveHealthThenUser(null);

    const result = await loader(
      loaderArgs('http://localhost/dashboard', { cookie: COOKIE_WITH_TOKEN }),
    );

    expect(result).toBeInstanceOf(Response);
    assertIsResponse(result);
    expect(result.headers.get('location')).toBe('/auth');
  });

  test('does not redirect an unprotected path when `me` resolves null', async () => {
    resolveHealthThenUser(null);

    const result = await loader(
      loaderArgs('http://localhost/', { cookie: COOKIE_WITH_TOKEN }),
    );

    expect(result).not.toBeInstanceOf(Response);
    assertIsData(result);
    const data = result;
    expect(data.user).toBeNull();
    expect(data.userLoadOk).toBe(true);
  });

  test('keeps the user logged in (no redirect) when the `me` query fails on a protected path', async () => {
    mockExecuteGraphqlWithAuth.mockImplementation(
      async (_request, document) => {
        if (document === GetRootHealthDocument) {
          return { serverHealth: HEALTHY };
        }
        throw new Error('me query failed');
      },
    );

    const result = await loader(
      loaderArgs('http://localhost/dashboard', { cookie: COOKIE_WITH_TOKEN }),
    );

    // A failed `me` is not the same as logged-out: userLoadOk is false, and the
    // loader must NOT redirect (it would otherwise bounce a real session on a blip).
    expect(result).not.toBeInstanceOf(Response);
    assertIsData(result);
    const data = result;
    expect(data.user).toBeNull();
    expect(data.userLoadOk).toBe(false);
    expect(data.rootLoaderFailure?.step).toBe('user');
  });

  test('records a health-step failure when the health query throws', async () => {
    mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('health down'));

    const result = await loader(loaderArgs('http://localhost/auth'));

    expect(result).not.toBeInstanceOf(Response);
    assertIsData(result);
    const data = result;
    expect(data.rootLoaderFailure?.step).toBe('health');
    expect(data.serverHealth.api).not.toBe('healthy');
  });
});
