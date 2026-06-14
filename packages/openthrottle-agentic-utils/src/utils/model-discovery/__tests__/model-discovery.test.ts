import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ModelEndpoint } from '../../../types/model-discovery.js';
import { DEFAULT_PORTS } from '../constants.js';
import { resolveHosts, resolvePorts } from '../hosts.js';
import {
  createLimiter,
  fingerprintProvider,
  probeAll,
  probeEndpoint,
} from '../probe.js';
import { dedupeEndpoints, discoverModels } from '../discover.js';

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

describe('resolveHosts', () => {
  it('defaults to localhost + the docker bridge alias', () => {
    expect(resolveHosts({})).toEqual(['localhost', 'host.docker.internal']);
  });

  it('LLM_HOSTS override replaces the default base set', () => {
    expect(resolveHosts({ LLM_HOSTS: '10.0.0.1, 10.0.0.2' })).toEqual([
      '10.0.0.1',
      '10.0.0.2',
    ]);
  });

  it('merges hosts parsed from provider URL env vars and de-dupes', () => {
    expect(
      resolveHosts({
        LM_STUDIO_URL: 'http://lmbox:1234',
        OLLAMA_BASE_URL: 'http://myhost:11500/v1',
      }),
    ).toEqual(['localhost', 'host.docker.internal', 'myhost', 'lmbox']);
  });

  it('appends extra host sources (the Tailscale seam) in order', () => {
    expect(
      resolveHosts({}, { extraSources: [() => ['tailnet-a', 'localhost']] }),
    ).toEqual(['localhost', 'host.docker.internal', 'tailnet-a']);
  });
});

describe('resolvePorts', () => {
  it('returns the default port set, sorted and de-duplicated', () => {
    const ports = resolvePorts({});
    expect(ports).toEqual([...DEFAULT_PORTS].sort((a, b) => a - b));
    expect(ports).toContain(8000);
    expect(ports).toContain(8020);
    expect(ports).toContain(1234);
    expect(ports).toContain(11434);
    expect(ports).toContain(11435);
  });

  it('LLM_PORTS override replaces the default set and merges custom ports', () => {
    expect(
      resolvePorts({ LLM_PORTS: '9001 9000', OLLAMA_URL: 'http://x:11500' }),
    ).toEqual([9000, 9001, 11500]);
  });

  it('ignores out-of-range ports', () => {
    expect(resolvePorts({ LLM_PORTS: '0, 70000, 8080' })).toEqual([8080]);
  });
});

describe('fingerprintProvider', () => {
  it('detects Ollama via /api/tags', async () => {
    routeFetch({ '/api/tags': () => json({ models: [{ name: 'llama3' }] }) });
    await expect(fingerprintProvider('http://localhost:11434')).resolves.toBe(
      'ollama',
    );
  });

  it('detects LM Studio via /api/v1/models (key + architecture)', async () => {
    routeFetch({
      '/api/v1/models': () =>
        json({ data: [{ architecture: 'llama', id: 'm', key: 'mlx' }] }),
    });
    await expect(fingerprintProvider('http://localhost:1234')).resolves.toBe(
      'lmstudio',
    );
  });

  it('returns null when neither provider matches', async () => {
    routeFetch({});
    await expect(
      fingerprintProvider('http://localhost:8000'),
    ).resolves.toBeNull();
  });
});

describe('probeEndpoint', () => {
  it('returns a typed endpoint on /v1/models success (models sorted + deduped)', async () => {
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
});

describe('dedupeEndpoints', () => {
  const make = (
    host: string,
    port: number,
    models: string[],
  ): ModelEndpoint => ({
    baseUrl: `http://${host}:${port}/v1`,
    host,
    models,
    port,
    provider: null,
  });

  it('collapses the same machine seen via multiple IPs, preferring localhost', () => {
    const result = dedupeEndpoints([
      make('host.docker.internal', 11434, ['llama3', 'qwen']),
      make('127.0.0.1', 11434, ['qwen', 'llama3']),
      make('localhost', 11434, ['llama3', 'qwen']),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.host).toBe('localhost');
  });

  it('keeps distinct (port, models) pairs and sorts by (host, port)', () => {
    const result = dedupeEndpoints([
      make('10.0.0.5', 8000, ['vllm']),
      make('localhost', 11434, ['llama3']),
      make('10.0.0.5', 1234, ['mlx']),
    ]);
    expect(
      result.map((endpoint) => `${endpoint.host}:${endpoint.port}`),
    ).toEqual(['10.0.0.5:1234', '10.0.0.5:8000', 'localhost:11434']);
  });
});

describe('discoverModels', () => {
  it('probes, de-dupes, and returns a typed DiscoveryResult with caller scannedAt', async () => {
    routeFetch({
      '/api/tags': () => json({ models: [{ name: 'llama3' }] }),
      '/v1/models': () => json({ data: [{ id: 'llama3' }] }),
    });
    const result = await discoverModels({
      hosts: ['localhost', '127.0.0.1'],
      ports: [11434],
      scannedAt: '2026-06-14T00:00:00.000Z',
    });
    expect(result.scannedAt).toBe('2026-06-14T00:00:00.000Z');
    expect(result.scannedHosts).toEqual(['localhost', '127.0.0.1']);
    // localhost + 127.0.0.1 both reach the same server → collapsed to one.
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]?.host).toBe('localhost');
    expect(result.endpoints[0]?.provider).toBe('ollama');
  });

  it('returns an empty result when nothing is reachable', async () => {
    routeFetch({});
    const result = await discoverModels({
      hosts: ['localhost'],
      ports: [9999],
      scannedAt: '2026-06-14T00:00:00.000Z',
    });
    expect(result.endpoints).toEqual([]);
  });
});

describe('createLimiter / probeAll concurrency', () => {
  it('never exceeds the configured concurrency', async () => {
    const limit = createLimiter(3);
    let active = 0;
    let peak = 0;
    await Promise.all(
      Array.from({ length: 12 }, () =>
        limit(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 10));
          active -= 1;
          return active;
        }),
      ),
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('probeAll fans out across host × port and drops dead hosts', async () => {
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
});
