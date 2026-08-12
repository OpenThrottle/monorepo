import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createLimiter,
  fingerprintProvider,
  probeAll,
  probeEndpoint,
} from '../probe.ts';

/** Build a JSON 200 Response. */
function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

/** Route mocked fetch by URL suffix; unmatched URLs 404. */
function routeFetch(
  routes: Record<string, () => Response | Promise<Response>>,
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      for (const [suffix, handler] of Object.entries(routes)) {
        if (url.endsWith(suffix)) {
          return Promise.resolve(handler());
        }
      }
      return Promise.resolve(new Response('', { status: 404 }));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fingerprintProvider', () => {
  it('detects Ollama via /api/tags', async () => {
    routeFetch({ '/api/tags': () => json({ models: [{ name: 'llama3' }] }) });
    await expect(fingerprintProvider('http://localhost:11434')).resolves.toBe(
      'ollama',
    );
  });

  it('detects LM Studio via /api/v1/models shape (architecture or key)', async () => {
    routeFetch({
      '/api/v1/models': () =>
        json({ data: [{ architecture: 'llama', id: 'm' }] }),
    });
    await expect(fingerprintProvider('http://localhost:1234')).resolves.toBe(
      'lmstudio',
    );
  });

  it('returns null when neither provider matches (generic OpenAI-compatible)', async () => {
    routeFetch({});
    await expect(
      fingerprintProvider('http://localhost:8000'),
    ).resolves.toBeNull();
  });

  it('returns null when Ollama JSON exists but lacks a models array', async () => {
    routeFetch({ '/api/tags': () => json({ nope: true }) });
    await expect(
      fingerprintProvider('http://localhost:8000'),
    ).resolves.toBeNull();
  });

  it('never throws when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );
    await expect(
      fingerprintProvider('http://localhost:8000'),
    ).resolves.toBeNull();
  });
});

describe('probeEndpoint', () => {
  it('returns a typed endpoint on /v1/models success, sorted + deduped models', async () => {
    routeFetch({
      '/api/tags': () => json({ models: [] }),
      '/v1/models': () =>
        json({ data: [{ id: 'qwen' }, { id: 'llama3' }, { id: 'qwen' }] }),
    });
    const endpoint = await probeEndpoint('localhost', 11434);
    expect(endpoint).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3', 'qwen'],
      port: 11434,
      provider: 'ollama',
    });
  });

  it('returns null when the /v1/models body has no data array', async () => {
    routeFetch({ '/v1/models': () => json({ nope: true }) });
    await expect(probeEndpoint('localhost', 8000)).resolves.toBeNull();
  });

  it('treats an empty data[] as a valid, idle endpoint', async () => {
    routeFetch({
      '/v1/models': () => json({ data: [] }),
    });
    const endpoint = await probeEndpoint('localhost', 8001);
    expect(endpoint).toEqual({
      baseUrl: 'http://localhost:8001/v1',
      host: 'localhost',
      models: [],
      port: 8001,
      provider: null,
    });
  });

  it('returns null on a non-2xx response', async () => {
    routeFetch({ '/v1/models': () => new Response('', { status: 500 }) });
    await expect(probeEndpoint('localhost', 8000)).resolves.toBeNull();
  });

  it('returns null when the request is aborted / times out', async () => {
    routeFetch({
      '/v1/models': () =>
        Promise.reject(new DOMException('aborted', 'AbortError')),
    });
    await expect(probeEndpoint('localhost', 8000)).resolves.toBeNull();
  });

  it('returns null on connection refused (fetch throws)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );
    await expect(probeEndpoint('localhost', 9999)).resolves.toBeNull();
  });

  it('honors a custom probeTimeoutMs / fingerprintTimeoutMs without throwing', async () => {
    routeFetch({
      '/api/tags': () => json({ models: [{ name: 'llama3' }] }),
      '/v1/models': () => json({ data: [{ id: 'm' }] }),
    });
    const endpoint = await probeEndpoint('localhost', 11434, {
      fingerprintTimeoutMs: 10,
      probeTimeoutMs: 10,
    });
    expect(endpoint?.provider).toBe('ollama');
  });
});

describe('createLimiter', () => {
  it('never exceeds the configured concurrency', async () => {
    const limit = createLimiter(3);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 12 }, () =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
          return active;
        }),
      ),
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('clamps concurrency to at least 1', async () => {
    const limit = createLimiter(0);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 4 }, () =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 1));
          active -= 1;
        }),
      ),
    );
    expect(peak).toBe(1);
  });

  it('routes a task rejection to the caller without breaking the queue', async () => {
    const limit = createLimiter(1);
    await expect(
      limit(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    // The limiter must recover and run subsequent tasks.
    await expect(limit(() => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});

describe('probeAll', () => {
  it('fans out across host x port and drops dead hosts', async () => {
    routeFetch({
      '/api/tags': () => json({ models: [] }),
      'localhost:11434/v1/models': () => json({ data: [{ id: 'a' }] }),
    });
    const endpoints = await probeAll(['localhost'], [11434, 8000], {
      maxConcurrency: 5,
    });
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]?.port).toBe(11434);
  });

  it('returns an empty array when no host/port combination answers', async () => {
    routeFetch({});
    const endpoints = await probeAll(['localhost'], [9999]);
    expect(endpoints).toEqual([]);
  });

  it('returns an empty array when given no hosts or no ports', async () => {
    await expect(probeAll([], [11434])).resolves.toEqual([]);
    await expect(probeAll(['localhost'], [])).resolves.toEqual([]);
  });
});
