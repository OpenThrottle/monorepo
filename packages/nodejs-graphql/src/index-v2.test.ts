import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { parse } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeGraphqlV2 } from './index-v2.js';
import { GRAPHQL_TIMEOUT_ERROR_PREFIX } from './utils.js';

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
