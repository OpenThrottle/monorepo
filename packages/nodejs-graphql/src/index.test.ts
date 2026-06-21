import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GRAPHQL_TIMEOUT_MS,
  GRAPHQL_TIMEOUT_ERROR_PREFIX,
  executeGraphqlAtUrl,
} from './index.js';

const doc = parse('{ __typename }') as TypedDocumentNode<
  { readonly __typename: string },
  Record<string, never>
>;

const url = 'https://api.example/graphql';

const okResponse = (): Response =>
  new Response(JSON.stringify({ data: { __typename: 'Query' } }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
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
