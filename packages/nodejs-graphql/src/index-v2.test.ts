import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { type DocumentNode, parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlV2 } from './index-v2.ts';
import { GRAPHQL_TIMEOUT_ERROR_PREFIX } from './utils.ts';

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

describe('executeGraphqlV2 timeout wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes an AbortSignal to fetch by default', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlV2(doc, undefined, { url });

    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('omits the signal when timeoutMs <= 0 and no caller signal', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlV2(doc, undefined, { timeoutMs: 0, url });

    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.signal).toBeUndefined();
  });

  it('forwards the caller signal when the timeout is disabled', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());
    const controller = new AbortController();

    await executeGraphqlV2(doc, undefined, {
      signal: controller.signal,
      timeoutMs: 0,
      url,
    });

    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.signal).toBe(controller.signal);
  });

  it('rethrows an aborted fetch as a recognizable timeout error', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'TimeoutError';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);

    const error = await executeGraphqlV2(doc, undefined, {
      timeoutMs: 25,
      url,
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

    const error = await executeGraphqlV2(doc, undefined, { url }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(original);
  });
});

describe('executeGraphqlV2 result branches', () => {
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

    const error = await executeGraphqlV2(doc, undefined, { url }).catch(
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

    const error = await executeGraphqlV2(doc, undefined, { url }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toBe('GraphQL errors: nope');
    }
  });

  it('throws when HTTP OK with no errors but data is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));

    const error = await executeGraphqlV2(doc, undefined, { url }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message).toBe('GraphQL response missing data');
    }
  });
});

describe('executeGraphqlV2 auth header construction', () => {
  const originalToken = process.env.API_TOKEN;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalToken === undefined) {
      delete process.env.API_TOKEN;
    } else {
      process.env.API_TOKEN = originalToken;
    }
  });

  it('sends Authorization: Bearer from options.token', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlV2(doc, undefined, { token: 'tok-123', url });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer tok-123');
  });

  it('falls back to API_TOKEN when no options.token is given', async () => {
    process.env.API_TOKEN = 'env-token';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlV2(doc, undefined, { url });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBe('Bearer env-token');
  });

  it('omits Authorization when token is empty and API_TOKEN is unset', async () => {
    delete process.env.API_TOKEN;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okResponse());

    await executeGraphqlV2(doc, undefined, { token: '', url });

    const init = fetchSpy.mock.calls[0]?.[1];
    const headers = init?.headers;
    if (!isRecord(headers)) {
      throw new Error('Expected headers to be a record');
    }
    expect(headers.Authorization).toBeUndefined();
  });
});
