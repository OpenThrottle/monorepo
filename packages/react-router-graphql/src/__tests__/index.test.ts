import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Kind } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeGraphqlMock = vi.fn();
const executeGraphqlWithAuthNodeJSMock = vi.fn();
const getAuthTokenFromCookieMock = vi.fn();

// Mirrors `@openthrottle/nodejs-graphql`'s class: the module is mocked whole, so
// the classifier's `isGraphqlResponseError` guard must see this same class.
class FakeGraphqlResponseError extends Error {
  readonly extensions: Readonly<Record<string, unknown>>;

  constructor(message: string, extensions: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'GraphqlResponseError';
    this.extensions = extensions;
  }
}

vi.mock('@openthrottle/nodejs-graphql', () => ({
  DEFAULT_GRAPHQL_TIMEOUT_MS: 15_000,
  GRAPHQL_TIMEOUT_ERROR_PREFIX: 'openthrottle-server GraphQL request timed out',
  GraphqlResponseError: FakeGraphqlResponseError,
  executeGraphql: (...args: ReadonlyArray<unknown>): unknown =>
    executeGraphqlMock(...args),
  executeGraphqlWithAuth: (...args: ReadonlyArray<unknown>): unknown =>
    executeGraphqlWithAuthNodeJSMock(...args),
  isGraphqlResponseError: (error: unknown): boolean =>
    error instanceof FakeGraphqlResponseError,
}));

vi.mock('@openthrottle/react-router-auth', () => ({
  getAuthTokenFromCookie: (...args: ReadonlyArray<unknown>): unknown =>
    getAuthTokenFromCookieMock(...args),
  getClearAuthCookieHeader: (): string => 'token=; Max-Age=0; Path=/',
}));

// `./index` re-exports the ws hooks, which transitively evaluate
// `@openthrottle/react-router-utils` config that reads `window.env` under jsdom.
// Seed it before the dynamic import so module evaluation does not throw.
Object.assign(window, { env: { NODE_ENV: 'test' } });

const {
  DEFAULT_LOADER_TIMEOUT_MS,
  GraphqlAuthError,
  GraphqlTimeoutError,
  executeGraphqlWithAuth,
  isAuthError,
  isTimeoutError,
  redirectOnAuthError,
} = await import('../index');

const document: TypedDocumentNode<unknown, Record<string, unknown>> = {
  definitions: [],
  kind: Kind.DOCUMENT,
};

const makeRequest = (): Request => {
  return new Request('https://example.test', {
    headers: { cookie: 'session=abc' },
  });
};

describe('executeGraphqlWithAuth dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses the token from the request cookie header', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockResolvedValue({ ok: true });

    await executeGraphqlWithAuth(makeRequest(), document);

    expect(getAuthTokenFromCookieMock).toHaveBeenCalledWith('session=abc');
  });

  it('passes an empty string to the cookie parser when no cookie header is present', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockResolvedValue({ ok: true });

    await executeGraphqlWithAuth(new Request('https://example.test'), document);

    expect(getAuthTokenFromCookieMock).toHaveBeenCalledWith('');
  });

  it('calls the unauthenticated executeGraphql when no token is present', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockResolvedValue({ ok: true });
    const variables = { planId: 'p1' };

    await executeGraphqlWithAuth(makeRequest(), document, variables);

    expect(executeGraphqlMock).toHaveBeenCalledTimes(1);
    expect(executeGraphqlMock).toHaveBeenCalledWith(document, variables, {
      timeoutMs: DEFAULT_LOADER_TIMEOUT_MS,
    });
    expect(executeGraphqlWithAuthNodeJSMock).not.toHaveBeenCalled();
  });

  it('calls the auth variant with the extracted token when a token is present', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    executeGraphqlWithAuthNodeJSMock.mockResolvedValue({ ok: true });
    const variables = { planId: 'p1' };

    await executeGraphqlWithAuth(makeRequest(), document, variables);

    expect(executeGraphqlWithAuthNodeJSMock).toHaveBeenCalledTimes(1);
    expect(executeGraphqlWithAuthNodeJSMock).toHaveBeenCalledWith(
      'a-token',
      document,
      variables,
      { timeoutMs: DEFAULT_LOADER_TIMEOUT_MS },
    );
    expect(executeGraphqlMock).not.toHaveBeenCalled();
  });
});

describe('executeGraphqlWithAuth auth-error mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with GraphqlAuthError carrying httpStatus on a 401 (token path)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(
      new Error('openthrottle-server GraphQL error 401: Unauthorized'),
    );

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(GraphqlAuthError);

    if (error instanceof GraphqlAuthError) {
      expect(error.httpStatus).toBe(401);
    }
  });

  it('rejects with GraphqlAuthError on a 403 (no-token path)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockRejectedValue(
      new Error('openthrottle-server GraphQL error 403: Forbidden'),
    );

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(GraphqlAuthError);

    if (error instanceof GraphqlAuthError) {
      expect(error.httpStatus).toBe(403);
    }
  });

  it('rejects with GraphqlAuthError on a GraphQL UNAUTHENTICATED error (HTTP 200, token path)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('revoked-token');
    const original = new FakeGraphqlResponseError(
      'GraphQL errors: Unauthorized',
      { code: 'UNAUTHENTICATED' },
    );
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(isAuthError(error)).toBe(true);

    if (error instanceof GraphqlAuthError) {
      expect(error.httpStatus).toBe(401);
      expect(error.cause).toBe(original);
    }
  });

  it('rejects with GraphqlAuthError on a GraphQL UNAUTHENTICATED error (no-token path)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockRejectedValue(
      new FakeGraphqlResponseError('GraphQL errors: Unauthorized', {
        code: 'UNAUTHENTICATED',
      }),
    );

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(GraphqlAuthError);
  });

  it('passes through a GraphQL FORBIDDEN error unchanged (signed in, not permitted)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new FakeGraphqlResponseError('GraphQL errors: Forbidden', {
      code: 'FORBIDDEN',
    });
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
    expect(isAuthError(error)).toBe(false);
  });

  it('does not classify on the message: an UNAUTHENTICATED-looking message without the code passes through', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new FakeGraphqlResponseError(
      'GraphQL errors: Unauthorized',
      {},
    );
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
  });

  it('passes through a non-auth HTTP error (500) unchanged', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new Error(
      'openthrottle-server GraphQL error 500: Internal Server Error',
    );
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
    expect(error).not.toBeInstanceOf(GraphqlAuthError);
  });

  it('passes through a GraphQL-errors message unchanged', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new Error('GraphQL errors: something went wrong');
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
    expect(error).not.toBeInstanceOf(GraphqlAuthError);
  });

  it('passes through a network error unchanged', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new Error('fetch failed');
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
  });

  it('returns data unchanged on success', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const data = { ok: true };
    executeGraphqlWithAuthNodeJSMock.mockResolvedValue(data);

    const result = await executeGraphqlWithAuth(makeRequest(), document);

    expect(result).toBe(data);
  });
});

describe('executeGraphqlWithAuth timeout handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards the default timeout to the token path', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    executeGraphqlWithAuthNodeJSMock.mockResolvedValue({ ok: true });

    await executeGraphqlWithAuth(makeRequest(), document);

    expect(executeGraphqlWithAuthNodeJSMock).toHaveBeenCalledWith(
      'a-token',
      document,
      undefined,
      { timeoutMs: DEFAULT_LOADER_TIMEOUT_MS },
    );
  });

  it('forwards an explicit timeout to the no-token path', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockResolvedValue({ ok: true });

    await executeGraphqlWithAuth(makeRequest(), document, undefined, {
      timeoutMs: 2_000,
    });

    expect(executeGraphqlMock).toHaveBeenCalledWith(document, undefined, {
      timeoutMs: 2_000,
    });
  });

  it('classifies a timeout-marked error as GraphqlTimeoutError (token path)', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(
      new Error('openthrottle-server GraphQL request timed out after 15000ms'),
    );

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(GraphqlTimeoutError);

    if (error instanceof GraphqlTimeoutError) {
      expect(error.timeoutMs).toBe(DEFAULT_LOADER_TIMEOUT_MS);
    }
  });

  it('records the configured timeoutMs on the GraphqlTimeoutError', async () => {
    getAuthTokenFromCookieMock.mockReturnValue(undefined);
    executeGraphqlMock.mockRejectedValue(
      new Error('openthrottle-server GraphQL request timed out after 500ms'),
    );

    const error = await executeGraphqlWithAuth(
      makeRequest(),
      document,
      undefined,
      {
        timeoutMs: 500,
      },
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GraphqlTimeoutError);

    if (error instanceof GraphqlTimeoutError) {
      expect(error.timeoutMs).toBe(500);
    }
  });

  it('does not classify a non-timeout error as a timeout', async () => {
    getAuthTokenFromCookieMock.mockReturnValue('a-token');
    const original = new Error('GraphQL errors: boom');
    executeGraphqlWithAuthNodeJSMock.mockRejectedValue(original);

    const error = await executeGraphqlWithAuth(makeRequest(), document).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
    expect(error).not.toBeInstanceOf(GraphqlTimeoutError);
  });
});

describe('isAuthError', () => {
  it('is true for a GraphqlAuthError', () => {
    expect(isAuthError(new GraphqlAuthError('Unauthorized', 401))).toBe(true);
  });

  it('is false for a plain Error whose message merely contains 401', () => {
    expect(
      isAuthError(new Error('openthrottle-server GraphQL error 500: 401 ish')),
    ).toBe(false);
  });

  it('is false for non-error values', () => {
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError('403')).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });

  it('narrows to GraphqlAuthError so httpStatus is accessible', () => {
    const error: unknown = new GraphqlAuthError('Forbidden', 403);

    if (isAuthError(error)) {
      expect(error.httpStatus).toBe(403);
    } else {
      throw new Error('expected isAuthError to narrow the type');
    }
  });
});

describe('isTimeoutError', () => {
  it('is true for a GraphqlTimeoutError', () => {
    expect(isTimeoutError(new GraphqlTimeoutError('timed out', 15_000))).toBe(
      true,
    );
  });

  it('is false for a GraphqlAuthError', () => {
    expect(isTimeoutError(new GraphqlAuthError('Unauthorized', 401))).toBe(
      false,
    );
  });

  it('is false for non-error values', () => {
    expect(isTimeoutError(undefined)).toBe(false);
    expect(isTimeoutError('timeout')).toBe(false);
    expect(isTimeoutError(null)).toBe(false);
  });

  it('narrows to GraphqlTimeoutError so timeoutMs is accessible', () => {
    const error: unknown = new GraphqlTimeoutError('timed out', 500);

    if (isTimeoutError(error)) {
      expect(error.timeoutMs).toBe(500);
    } else {
      throw new Error('expected isTimeoutError to narrow the type');
    }
  });
});

describe('redirectOnAuthError', () => {
  const catchThrown = (run: () => void): unknown => {
    try {
      run();
    } catch (thrown) {
      return thrown;
    }

    return undefined;
  };

  it('throws a redirect to /auth that clears the auth cookie for a GraphqlAuthError', () => {
    const thrown = catchThrown(() => {
      redirectOnAuthError(
        new GraphqlAuthError('GraphQL errors: Unauthorized', 401),
      );
    });

    expect(thrown).toBeInstanceOf(Response);

    if (thrown instanceof Response) {
      expect(thrown.status).toBe(302);
      expect(thrown.headers.get('Location')).toBe('/auth');
      expect(thrown.headers.get('Set-Cookie')).toBe(
        'token=; Max-Age=0; Path=/',
      );
    }
  });

  it('redirects to the given route when `to` is set', () => {
    const thrown = catchThrown(() => {
      redirectOnAuthError(new GraphqlAuthError('Forbidden', 403), {
        to: '/sign-in',
      });
    });

    expect(thrown).toBeInstanceOf(Response);

    if (thrown instanceof Response) {
      expect(thrown.headers.get('Location')).toBe('/sign-in');
    }
  });

  it('returns without throwing for a non-auth error, leaving the caller to rethrow it', () => {
    const thrown = catchThrown(() => {
      redirectOnAuthError(new Error('GraphQL errors: something went wrong'));
    });

    expect(thrown).toBeUndefined();
  });

  it('returns without throwing for a timeout error', () => {
    const thrown = catchThrown(() => {
      redirectOnAuthError(new GraphqlTimeoutError('timed out', 15_000));
    });

    expect(thrown).toBeUndefined();
  });
});
