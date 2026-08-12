// @vitest-environment node
import type { Params } from 'react-router';
import { RouterContextProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildAuthCookie, getClearAuthCookieHeader } from '../index';
import { authMiddleware } from '../middleware';

/** Build a JWT with the given payload (header + signature are dummies). */
const makeJwt = (payload: Record<string, unknown>): string => {
  const seg = (value: unknown): string =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${seg({ alg: 'HS256', typ: 'JWT' })}.${seg(payload)}.sig`;
};

/** A JWT whose `exp` claim is safely in the future. */
const validToken = makeJwt({
  exp: Math.floor(Date.now() / 1000) + 3600,
});

/** A JWT whose `exp` claim is in the past. */
const expiredToken = makeJwt({
  exp: Math.floor(Date.now() / 1000) - 3600,
});

/** A no-op downstream `next` matching `MiddlewareNextFunction`. */
const next = (): Promise<unknown> => Promise.resolve(undefined);

/** Builds middleware args for a given pathname and optional cookie token. */
const buildArgs = (
  pathname: string,
  token?: string,
): Parameters<typeof authMiddleware>[0] => {
  const url = new URL(`https://example.test${pathname}`);
  const headers = new Headers();

  if (token !== undefined) {
    const cookieHeader = buildAuthCookie(token, {
      insecureCookies: true,
    }).split(';')[0];

    if (cookieHeader !== undefined) {
      headers.set('cookie', cookieHeader);
    }
  }

  const params: Params = {};

  return {
    context: new RouterContextProvider(),
    params,
    pattern: pathname,
    request: new Request(url, { headers }),
    url,
  };
};

/** Invokes the middleware and captures a thrown `Response`, if any. */
const runMiddleware = (args: Parameters<typeof authMiddleware>[0]): unknown => {
  try {
    return authMiddleware(args, next);
  } catch (error) {
    return error;
  }
};

/** Narrows a `runMiddleware` result to `Response` without a type assertion. */
function assertIsRedirectResponse(value: unknown): asserts value is Response {
  if (!(value instanceof Response)) {
    throw new Error('Expected authMiddleware to throw a redirect Response');
  }
}

describe('authMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBetaFlag = process.env.FEATURE_BETA_PREVIEW;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.FEATURE_BETA_PREVIEW = originalBetaFlag;
    vi.restoreAllMocks();
  });

  describe('when there is no auth token', () => {
    it('redirects a protected route to /auth and clears the auth cookie', () => {
      const result = runMiddleware(buildArgs('/dashboard'));

      assertIsRedirectResponse(result);
      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toBe('/auth');
      expect(result.headers.get('Set-Cookie')).toBe(getClearAuthCookieHeader());
    });

    it('does not redirect a public route', () => {
      const result = runMiddleware(buildArgs('/about'));

      expect(result).toBeUndefined();
    });

    it('treats a public route with a trailing path segment as public too', () => {
      const result = runMiddleware(buildArgs('/legal/privacy'));

      expect(result).toBeUndefined();
    });
  });

  describe('when the auth token is expired', () => {
    it('redirects a protected route to /auth exactly like a missing token', () => {
      const result = runMiddleware(buildArgs('/dashboard', expiredToken));

      assertIsRedirectResponse(result);
      expect(result.headers.get('Location')).toBe('/auth');
    });

    it('does not redirect a public route even with an expired token', () => {
      const result = runMiddleware(buildArgs('/auth', expiredToken));

      expect(result).toBeUndefined();
    });
  });

  describe('when the auth token is valid', () => {
    it('passes through a non-beta, non-public route', () => {
      const result = runMiddleware(buildArgs('/dashboard', validToken));

      expect(result).toBeUndefined();
    });

    it('passes through a public route', () => {
      const result = runMiddleware(buildArgs('/about', validToken));

      expect(result).toBeUndefined();
    });

    describe('and the route is beta-gated', () => {
      it('redirects to /dashboard when beta preview is disabled', () => {
        process.env.FEATURE_BETA_PREVIEW = 'false';

        const result = runMiddleware(buildArgs('/ide', validToken));

        assertIsRedirectResponse(result);
        expect(result.status).toBe(302);
        expect(result.headers.get('Location')).toBe('/dashboard');
      });

      it('redirects a nested beta path (prefix match) when beta preview is disabled', () => {
        process.env.FEATURE_BETA_PREVIEW = 'false';

        const result = runMiddleware(buildArgs('/ide/session-1', validToken));

        assertIsRedirectResponse(result);
        expect(result.headers.get('Location')).toBe('/dashboard');
      });

      it('passes through when beta preview is enabled', () => {
        process.env.FEATURE_BETA_PREVIEW = 'true';

        const result = runMiddleware(buildArgs('/ide', validToken));

        expect(result).toBeUndefined();
      });
    });
  });

  describe('diagnostic logging', () => {
    it('logs the redirect reason outside of production', () => {
      process.env.NODE_ENV = 'development';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      runMiddleware(buildArgs('/dashboard'));

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or expired token'),
        expect.objectContaining({ pathname: '/dashboard' }),
      );
    });

    it('does not log in production', () => {
      process.env.NODE_ENV = 'production';
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      runMiddleware(buildArgs('/dashboard'));

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
