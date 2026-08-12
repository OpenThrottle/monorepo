import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ModelEndpoint } from '../../../types/model-discovery.ts';
import { dedupeEndpoints, discoverModels } from '../discover.ts';

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

  it('breaks ties for unranked hosts by host string', () => {
    const result = dedupeEndpoints([
      make('zzz-host', 11434, ['m']),
      make('aaa-host', 11434, ['m']),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.host).toBe('aaa-host');
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

  it('returns an empty array for an empty input', () => {
    expect(dedupeEndpoints([])).toEqual([]);
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
    // localhost + 127.0.0.1 both reach the same server -> collapsed to one.
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]?.host).toBe('localhost');
    expect(result.endpoints[0]?.provider).toBe('ollama');
  });

  it('defaults scannedAt to now when the caller omits it', async () => {
    routeFetch({});
    const before = Date.now();
    const result = await discoverModels({ hosts: ['localhost'], ports: [] });
    const after = Date.now();
    const scannedAtMs = new Date(result.scannedAt).getTime();
    expect(scannedAtMs).toBeGreaterThanOrEqual(before);
    expect(scannedAtMs).toBeLessThanOrEqual(after);
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

  it('forwards probe timeout/concurrency options through to the sweep', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('', { status: 404 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await discoverModels({
      fingerprintTimeoutMs: 10,
      hosts: ['localhost'],
      maxConcurrency: 1,
      ports: [8000, 8001],
      probeTimeoutMs: 10,
    });

    // One /v1/models attempt per (host, port) pair.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
