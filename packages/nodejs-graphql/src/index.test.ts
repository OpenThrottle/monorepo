import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GRAPHQL_TIMEOUT_MS,
  GRAPHQL_TIMEOUT_ERROR_PREFIX,
  executeGraphql,
  executeGraphqlAtUrl,
  executeGraphqlWithAuth,
} from './index.ts';

// See graphql-v2.test.ts: the generic overload brands the parsed document with
// the caller's result/variables types without a type assertion.
function typedDocument<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(source: string): TypedDocumentNode<TData, TVariables>;
function typedDocument(source: string): DocumentNode {
  return parse(source);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const doc = typedDocument<{ readonly __typename: string }>('{ __typename }');

const url = 'https://api.example/graphql';

const okResponse = (): Response =>
  new Response(JSON.stringify({ data: { __typename: 'Query' } }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
    ...init,
  });

describe('executeGraphqlAtUrl timeout wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes an AbortSignal to fetch by default', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlAtUrl(url, doc, undefined);

    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('omits the signal when timeoutMs <= 0 (timeout disabled)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlAtUrl(url, doc, undefined, { timeoutMs: 0 });

    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.signal).toBeUndefined();
  });

  it('rethrows an aborted fetch as a recognizable timeout error', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'TimeoutError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    const error = await executeGraphqlAtUrl(url, doc, undefined, {
      timeoutMs: 25,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);

    if (error instanceof Error) {
      expect(error.message.startsWith(GRAPHQL_TIMEOUT_ERROR_PREFIX)).toBe(true);
      expect(error.message).toContain('25ms');
      expect(error.cause).toBe(abortError);
    }
  });

  it('passes through a non-abort fetch rejection unchanged', async () => {
    const original = new Error('ECONNREFUSED');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(original);

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
  });

  it('exposes a sane default timeout', () => {
    expect(DEFAULT_GRAPHQL_TIMEOUT_MS).toBe(15_000);
  });
});

describe('executeGraphqlAtUrl response body parsing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a meaningful error when the body is not valid JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', {
        headers: { 'Content-Type': 'text/html' },
        status: 502,
        statusText: 'Bad Gateway',
      }),
    );

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);

    if (error instanceof Error) {
      expect(error.message).toContain('was not valid JSON');
      expect(error.message).toContain('502');
    }
  });

  it('throws a meaningful error when JSON has an unexpected shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(['not', 'an', 'object']), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        statusText: 'OK',
      }),
    );

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);

    if (error instanceof Error) {
      expect(error.message).toContain('unexpected shape');
    }
  });

  it('returns data for a well-formed JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    const data = await executeGraphqlAtUrl(url, doc, undefined);

    expect(data.__typename).toBe('Query');
  });
});

describe('executeGraphqlAtUrl error branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws with status and message when the response is non-OK', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { errors: [{ message: 'boom' }] },
        { status: 500, statusText: 'Server Error' },
      ),
    );

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain('GraphQL error 500');
      expect(error.message).toContain('boom');
    }
  });

  it('throws when HTTP OK but the body carries graphql errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ data: null, errors: [{ message: 'nope' }] }),
    );

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toBe('GraphQL errors: nope');
    }
  });

  it('throws when HTTP OK with no errors but data is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));

    const error = await executeGraphqlAtUrl(url, doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toBe('GraphQL response missing data');
    }
  });

  it('sends Authorization: Bearer when a token is provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlAtUrl(url, doc, undefined, { token: 'tok-123' });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer tok-123');
  });

  it('applies the Bearer token after custom headers so the token wins', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlAtUrl(url, doc, undefined, {
      headers: { Authorization: 'Bearer old', 'X-Trace': '1' },
      token: 'new',
    });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer new');
    expect(headers['X-Trace']).toBe('1');
  });

  it('omits Authorization when the token is an empty string', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlAtUrl(url, doc, undefined, { token: '' });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('executeGraphql (V1 base, env-driven URL)', () => {
  const originalUrl = process.env.API_URL_INTERNAL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalUrl === undefined) {
      delete process.env.API_URL_INTERNAL;
    } else {
      process.env.API_URL_INTERNAL = originalUrl;
    }
  });

  it('resolves the URL from API_URL_INTERNAL and returns data', async () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    const data = await executeGraphql(doc, undefined);

    expect(data.__typename).toBe('Query');
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('http://localhost:6021/graphql');
  });

  it('throws when the response is non-OK', async () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { errors: [{ message: 'boom' }] },
        { status: 503, statusText: 'Unavailable' },
      ),
    );

    const error = await executeGraphql(doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain('GraphQL error 503');
      expect(error.message).toContain('boom');
    }
  });

  it('throws when the env URL is unset', async () => {
    delete process.env.API_URL_INTERNAL;

    const error = await executeGraphql(doc, undefined).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toContain('API_URL_INTERNAL is not set');
    }
  });

  it('forwards custom headers to fetch', async () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphql(doc, undefined, {
      headers: { Authorization: 'Bearer abc' },
    });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer abc');
  });
});

describe('executeGraphqlWithAuth', () => {
  const originalUrl = process.env.API_URL_INTERNAL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalUrl === undefined) {
      delete process.env.API_URL_INTERNAL;
    } else {
      process.env.API_URL_INTERNAL = originalUrl;
    }
  });

  it('sends Authorization: Bearer <token> when a token is present', async () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlWithAuth('tok-xyz', doc, undefined);

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer tok-xyz');
  });

  it('omits Authorization when the token is an empty string', async () => {
    process.env.API_URL_INTERNAL = 'http://localhost:6021';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlWithAuth('', doc, undefined);

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBeUndefined();
  });
});
