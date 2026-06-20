import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeGraphqlMock = vi.fn();
const executeGraphqlWithAuthNodeJSMock = vi.fn();
const getAuthTokenFromCookieMock = vi.fn();

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: (...args: ReadonlyArray<unknown>): unknown =>
    executeGraphqlMock(...args),
  executeGraphqlWithAuth: (...args: ReadonlyArray<unknown>): unknown =>
    executeGraphqlWithAuthNodeJSMock(...args),
}));

vi.mock('@openthrottle/react-router-auth', () => ({
  getAuthTokenFromCookie: (...args: ReadonlyArray<unknown>): unknown =>
    getAuthTokenFromCookieMock(...args),
}));

// `./index` re-exports the ws hooks, which transitively evaluate
// `@openthrottle/react-router-utils` config that reads `window.env` under jsdom.
// Seed it before the dynamic import so module evaluation does not throw.
Object.assign(window, { env: { NODE_ENV: 'test' } });

const { GraphqlAuthError, executeGraphqlWithAuth } = await import('./index');

const document = {} as TypedDocumentNode<unknown, Record<string, unknown>>;

const makeRequest = (): Request =>
  new Request('https://example.test', {
    headers: { cookie: 'session=abc' },
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
