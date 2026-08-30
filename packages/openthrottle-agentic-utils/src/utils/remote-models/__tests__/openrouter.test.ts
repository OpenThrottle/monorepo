import { describe, expect, it } from 'vitest';

import type {
  RemoteFetchImpl,
  RemoteModelCatalog,
} from '../../../types/remote-models.ts';
import { OPENROUTER_DEFAULT_BASE_URL } from '../constants.ts';
import { fetchOpenRouterModels } from '../openrouter.ts';

const FETCHED_AT = '2026-08-29T00:00:00.000Z';

/** One recorded call to the injected fetch. */
interface RecordedCall {
  readonly init: RequestInit | undefined;
  readonly url: string;
}

/** An injected fetch plus the calls it saw. No global stubbing, no network. */
interface FetchStub {
  readonly calls: RecordedCall[];
  readonly impl: RemoteFetchImpl;
}

/** Build an injectable fetch that always answers with `response`. */
function stub(response: () => Response): FetchStub {
  const calls: RecordedCall[] = [];
  const impl: RemoteFetchImpl = (input, init) => {
    calls.push({ init, url: String(input) });
    return Promise.resolve(response());
  };
  return { calls, impl };
}

/** Build an injectable fetch that answers with a JSON body. */
function stubJson(body: unknown, status = 200): FetchStub {
  return stub(
    () =>
      new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json' },
        status,
      }),
  );
}

/**
 * One entry shaped like the live response (verified 2026-08-29). Only `id`,
 * `name` and `context_length` are read; the rest is present to prove it is
 * ignored rather than validated.
 */
function entry(
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    architecture: { modality: 'text->text', tokenizer: 'Other' },
    context_length: 200_000,
    created: 1787897375,
    description: 'A model.',
    id: 'anthropic/claude-sonnet-5',
    name: 'Anthropic: Claude Sonnet 5',
    pricing: { completion: '0.000015', prompt: '0.000003' },
    supported_parameters: ['tools'],
    top_provider: { context_length: 200_000 },
    ...overrides,
  };
}

async function fetchWith(
  fetchStub: FetchStub,
  options: { apiKey?: string; baseUrl?: string } = {},
): Promise<RemoteModelCatalog> {
  return fetchOpenRouterModels({
    baseUrl: options.baseUrl ?? OPENROUTER_DEFAULT_BASE_URL,
    fetchImpl: fetchStub.impl,
    fetchedAt: FETCHED_AT,
    ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
  });
}

describe('fetchOpenRouterModels', () => {
  it('maps the live envelope to sorted RemoteModel entries', async () => {
    const catalog = await fetchWith(
      stubJson({
        data: [
          entry({ id: 'z-ai/glm-5.3-flash', name: 'Z.AI: GLM 5.3 Flash' }),
          entry(),
        ],
        links: {},
        total_count: 2,
      }),
    );

    expect(catalog).toEqual({
      fetchedAt: FETCHED_AT,
      models: [
        {
          contextLength: 200_000,
          id: 'anthropic/claude-sonnet-5',
          name: 'Anthropic: Claude Sonnet 5',
          provider: 'openrouter',
        },
        {
          contextLength: 200_000,
          id: 'z-ai/glm-5.3-flash',
          name: 'Z.AI: GLM 5.3 Flash',
          provider: 'openrouter',
        },
      ],
      provider: 'openrouter',
    });
  });

  it('requests {baseUrl}/models without doubling a trailing slash', async () => {
    const fetchStub = stubJson({ data: [] });

    await fetchWith(fetchStub, { baseUrl: 'https://openrouter.ai/api/v1/' });

    expect(fetchStub.calls[0]?.url).toBe('https://openrouter.ai/api/v1/models');
  });

  it('sends no Authorization header when no key is supplied', async () => {
    const fetchStub = stubJson({ data: [] });

    await fetchWith(fetchStub);

    expect(fetchStub.calls[0]?.init?.headers).not.toHaveProperty(
      'authorization',
    );
  });

  it('sends a Bearer header when a key is supplied', async () => {
    const fetchStub = stubJson({ data: [] });

    await fetchWith(fetchStub, { apiKey: 'sk-or-v1-test' });

    expect(fetchStub.calls[0]?.init?.headers).toMatchObject({
      authorization: 'Bearer sk-or-v1-test',
    });
  });

  it('returns an empty catalog for an empty data array', async () => {
    const catalog = await fetchWith(stubJson({ data: [] }));

    expect(catalog.models).toEqual([]);
    expect(catalog.provider).toBe('openrouter');
  });

  it('skips malformed entries instead of throwing', async () => {
    const catalog = await fetchWith(
      stubJson({
        data: [
          null,
          'not-an-object',
          entry({ id: '' }),
          entry({ name: undefined }),
          entry({ context_length: 'lots' }),
          entry({ id: 'ok/model', name: 'OK' }),
        ],
      }),
    );

    expect(catalog.models.map((model) => model.id)).toEqual(['ok/model']);
  });

  it('de-duplicates repeated ids but keeps distinct suffixed routes', async () => {
    const catalog = await fetchWith(
      stubJson({
        data: [
          entry({ id: 'anthropic/claude-opus-5' }),
          entry({ id: 'anthropic/claude-opus-5' }),
          entry({ id: 'anthropic/claude-opus-5:batch' }),
        ],
      }),
    );

    expect(catalog.models.map((model) => model.id)).toEqual([
      'anthropic/claude-opus-5',
      'anthropic/claude-opus-5:batch',
    ]);
  });

  it('returns an empty catalog on a non-2xx response', async () => {
    const catalog = await fetchWith(
      stubJson({ error: { message: 'User not found.' } }, 401),
    );

    expect(catalog).toEqual({
      fetchedAt: FETCHED_AT,
      models: [],
      provider: 'openrouter',
    });
  });

  it('returns an empty catalog when the body is not a model list', async () => {
    const catalog = await fetchWith(stubJson({ total_count: 0 }));

    expect(catalog.models).toEqual([]);
  });

  it('returns an empty catalog when the body is not JSON', async () => {
    const catalog = await fetchWith(
      stub(() => new Response('<html>nope</html>', { status: 200 })),
    );

    expect(catalog.models).toEqual([]);
  });

  it('returns an empty catalog when the request aborts or the network fails', async () => {
    const impl: RemoteFetchImpl = () =>
      Promise.reject(
        new DOMException('The operation timed out.', 'TimeoutError'),
      );

    const catalog = await fetchOpenRouterModels({
      baseUrl: OPENROUTER_DEFAULT_BASE_URL,
      fetchImpl: impl,
      fetchedAt: FETCHED_AT,
    });

    expect(catalog).toEqual({
      fetchedAt: FETCHED_AT,
      models: [],
      provider: 'openrouter',
    });
  });

  it('passes an abort signal so a hung gateway cannot stall the caller', async () => {
    const fetchStub = stubJson({ data: [] });

    await fetchWith(fetchStub);

    expect(fetchStub.calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('merges caller-supplied attribution headers into the request', async () => {
    const fetchStub = stubJson({ data: [] });

    await fetchOpenRouterModels({
      baseUrl: OPENROUTER_DEFAULT_BASE_URL,
      fetchImpl: fetchStub.impl,
      fetchedAt: FETCHED_AT,
      headers: { 'HTTP-Referer': 'https://openthrottle.ai' },
    });

    expect(fetchStub.calls[0]?.init?.headers).toMatchObject({
      'HTTP-Referer': 'https://openthrottle.ai',
      accept: 'application/json',
    });
  });
});
