import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, parse } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import type {
  GraphqlV2Failure,
  GraphqlV2FailureContext,
} from './graphql-v2.ts';
import { defaultRetryOn, executeGraphql_v2 } from './graphql-v2.ts';

// Parse a GraphQL string and brand it with the caller-supplied result/variables
// types. The generic overload carries the phantom `TypedDocumentNode` types that
// `parse` (which returns a plain `DocumentNode`) erases, without an assertion.
function typedDocument<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(source: string): TypedDocumentNode<TData, TVariables>;
function typedDocument(source: string): DocumentNode {
  return parse(source);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const emptyVarsDoc = typedDocument<{ readonly __typename: string }>(
  '{ __typename }',
);

const dateFieldDoc = typedDocument<{ readonly item: { readonly at: Date } }>(
  'query Q { item { at } }',
);

const createJsonResponse = (init: ResponseInit, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

describe('executeGraphql_v2', () => {
  it('returns data and parses ISO DateTime strings when parseDateTime is default', async () => {
    const at = '2024-01-15T12:30:00.000Z';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ status: 200 }, { data: { item: { at } } }),
      );

    const result = await executeGraphql_v2(dateFieldDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.item.at).toBeInstanceOf(Date);
    expect(result.data.item.at.toISOString()).toBe(at);
  });

  it('skips DateTime parsing when parseDateTime is false', async () => {
    const at = '2024-01-15T12:30:00.000Z';
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ status: 200 }, { data: { item: { at } } }),
      );

    const result = await executeGraphql_v2(dateFieldDoc, undefined, {
      fetch: fetchMock,
      parseDateTime: false,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.item.at).toBe(at);
  });

  it('returns http failure when status is not OK', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          { status: 502 },
          { errors: [{ message: 'Bad gateway' }] },
        ),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('http');
    expect(result.error.httpStatus).toBe(502);
    expect(result.error.message).toBe('Bad gateway');
    expect(result.error.graphqlErrors?.[0]?.message).toBe('Bad gateway');
  });

  it('returns graphql_errors when HTTP OK but errors array present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        { status: 200 },
        {
          data: null,
          errors: [{ message: 'nope', path: ['x', 0] }],
        },
      ),
    );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('graphql_errors');
    expect(result.error.graphqlErrors?.[0]?.message).toBe('nope');
    expect(result.error.graphqlPath).toEqual(['x', 0]);
  });

  it('returns missing_data when data is null with no errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createJsonResponse({ status: 200 }, { data: null }));

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('missing_data');
  });

  it('returns invalid_json when body is not JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('not json', { status: 200 }));

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('invalid_json');
  });

  it('forwards AbortSignal to fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        expect(init?.signal).toBeDefined();
        expect(init?.signal?.aborted).toBe(true);
        return Promise.reject(new Error('should not resolve'));
      });

    const controller = new AbortController();
    controller.abort();

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      signal: controller.signal,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('applies mapFailure to shape errors', async () => {
    interface CodeFailure extends GraphqlV2Failure {
      readonly code: string;
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValue(createJsonResponse({ status: 200 }, { data: null }));

    const mapFailure = (ctx: GraphqlV2FailureContext): CodeFailure => ({
      ...ctx.failure,
      code: 'E_MISSING',
    });

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      mapFailure,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('missing_data');
    expect(result.error.code).toBe('E_MISSING');
  });

  it('returns http failure even when a data payload is present on a non-OK status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          { status: 503, statusText: 'Service Unavailable' },
          { data: { __typename: 'Query' }, errors: [{ message: 'degraded' }] },
        ),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('http');
    expect(result.error.httpStatus).toBe(503);
    expect(result.error.message).toBe('degraded');
  });

  it('returns unknown kind for an empty response body (rawBody === "")', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 200 }));

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('unknown');
  });

  it('merges requestInit into fetch without clobbering method, body, or signal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ status: 200 }, { data: { __typename: 'Query' } }),
      );
    const controller = new AbortController();

    await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      requestInit: { cache: 'no-store', keepalive: true },
      signal: controller.signal,
      url: 'https://api.example/graphql',
    });

    const init: RequestInit = fetchMock.mock.calls[0]?.[1];
    expect(init.cache).toBe('no-store');
    expect(init.keepalive).toBe(true);
    expect(init.method).toBe('POST');
    expect(typeof init.body).toBe('string');
    expect(init.signal).toBe(controller.signal);
  });

  it('keeps executor-owned method, body, and signal when requestInit tries to set them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ status: 200 }, { data: { __typename: 'Query' } }),
      );
    const callerSignal = new AbortController().signal;

    // The `requestInit` type Omits body/headers/method/signal, so they cannot be
    // passed through the typed API. Build the literal separately and spread it to
    // probe the executor's runtime precedence: it spreads requestInit first, then
    // overwrites these reserved keys. The signature still rejects them statically.
    const reservedOverrides = {
      body: 'evil',
      method: 'GET',
      signal: new AbortController().signal,
    };

    await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      requestInit: { ...reservedOverrides, cache: 'no-store' },
      signal: callerSignal,
      url: 'https://api.example/graphql',
    });

    const init: RequestInit = fetchMock.mock.calls[0]?.[1];
    expect(init.method).toBe('POST');
    expect(init.body).not.toBe('evil');
    expect(init.signal).toBe(callerSignal);
    expect(init.cache).toBe('no-store');
  });

  it('sets Authorization Bearer after custom headers so token wins', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ status: 200 }, { data: { __typename: 'Query' } }),
      );

    await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      headers: { Authorization: 'Bearer old', 'X-Trace': '1' },
      token: 'new',
      url: 'https://api.example/graphql',
    });

    const init: RequestInit = fetchMock.mock.calls[0]?.[1];
    const hdrs = init.headers;
    if (!isRecord(hdrs)) {
      throw new Error('Expected headers to be a record');
    }
    expect(hdrs.Authorization).toBe('Bearer new');
    expect(hdrs['X-Trace']).toBe('1');
  });
});

describe('defaultRetryOn', () => {
  const failure = (
    overrides: Partial<GraphqlV2Failure> & Pick<GraphqlV2Failure, 'kind'>,
  ): GraphqlV2Failure => ({
    cause: undefined,
    graphqlErrors: undefined,
    graphqlPath: undefined,
    httpStatus: undefined,
    message: 'x',
    ...overrides,
  });

  it('retries network failures', () => {
    expect(defaultRetryOn(failure({ kind: 'network' }))).toBe(true);
  });

  it('retries http 5xx but not http 4xx', () => {
    expect(defaultRetryOn(failure({ httpStatus: 502, kind: 'http' }))).toBe(
      true,
    );
    expect(defaultRetryOn(failure({ httpStatus: 500, kind: 'http' }))).toBe(
      true,
    );
    expect(defaultRetryOn(failure({ httpStatus: 404, kind: 'http' }))).toBe(
      false,
    );
  });

  it('never retries deterministic failures', () => {
    expect(defaultRetryOn(failure({ kind: 'graphql_errors' }))).toBe(false);
    expect(defaultRetryOn(failure({ kind: 'missing_data' }))).toBe(false);
    expect(defaultRetryOn(failure({ kind: 'invalid_json' }))).toBe(false);
    expect(defaultRetryOn(failure({ kind: 'unknown' }))).toBe(false);
  });
});

describe('executeGraphql_v2 retry', () => {
  it('does not retry by default (single-shot)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          { status: 502 },
          { errors: [{ message: 'Bad gateway' }] },
        ),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries transient http 5xx then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          { status: 502 },
          { errors: [{ message: 'Bad gateway' }] },
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({ status: 200 }, { data: { __typename: 'Query' } }),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      retry: { attempts: 2, backoffMs: 0 },
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries network failures up to attempts then returns last failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      retry: { attempts: 2, backoffMs: 0 },
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('network');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry deterministic graphql_errors failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          { status: 200 },
          { data: null, errors: [{ message: 'nope' }] },
        ),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      retry: { attempts: 3, backoffMs: 0 },
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.kind).toBe('graphql_errors');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors a custom retryOn predicate', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          createJsonResponse(
            { status: 200 },
            { data: null, errors: [{ message: 'nope' }] },
          ),
        ),
      );

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      retry: {
        attempts: 2,
        backoffMs: 0,
        retryOn: (f) => f.kind === 'graphql_errors',
      },
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when the abort signal fires', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve(
        createJsonResponse(
          { status: 502 },
          { errors: [{ message: 'Bad gateway' }] },
        ),
      );
    });

    const result = await executeGraphql_v2(emptyVarsDoc, undefined, {
      fetch: fetchMock,
      retry: { attempts: 3, backoffMs: 0 },
      signal: controller.signal,
      url: 'https://api.example/graphql',
    });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
