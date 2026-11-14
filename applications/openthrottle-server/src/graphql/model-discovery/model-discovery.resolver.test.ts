/**
 * @description Tests for ModelDiscoveryResolver: maps the cached DiscoveryResult from the injected
 * NestjsModelDiscoveryService into the ListResult-style payload (endpoints + totalCount +
 * scannedHosts/scannedAt). The service is mocked — no network.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import type { GraphQLResolveInfo } from 'graphql';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_DISCOVERY_CACHE_HINT } from './model-discovery.constants.ts';
import type { DiscoverLocalModelsResult } from './model-discovery.object.ts';
import { ModelDiscoveryResolver } from './model-discovery.resolver.ts';

/** Resolve info carrying Apollo's cacheControl, as the cache-control plugin sets it. */
function buildInfo(setCacheHint: Mock): GraphQLResolveInfo {
  const info = createMock<GraphQLResolveInfo>();
  Reflect.set(info, 'cacheControl', { setCacheHint });
  return info;
}

const SNAPSHOT: DiscoveryResult = {
  endpoints: [
    {
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3', 'qwen'],
      port: 11434,
      provider: 'ollama',
    },
    {
      baseUrl: 'http://localhost:8000/v1',
      host: 'localhost',
      models: ['vllm-model'],
      port: 8000,
      provider: null,
    },
  ],
  scannedAt: '2026-06-14T00:00:00.000Z',
  scannedHosts: ['localhost', 'host.docker.internal'],
};

describe('ModelDiscoveryResolver', () => {
  let service: NestjsModelDiscoveryService;
  let resolver: ModelDiscoveryResolver;

  beforeEach(() => {
    service = createMock<NestjsModelDiscoveryService>();
    vi.mocked(service.discover).mockResolvedValue(SNAPSHOT);
    resolver = new ModelDiscoveryResolver(service);
  });

  it('reads the cached snapshot (no forceRefresh) and maps the payload', async () => {
    const result = await resolver.discoverLocalModels(buildInfo(vi.fn()));
    expect(service.discover).toHaveBeenCalledWith();
    expect(result.totalCount).toBe(2);
    expect(result.scannedAt).toBe('2026-06-14T00:00:00.000Z');
    expect(result.scannedHosts).toEqual(['localhost', 'host.docker.internal']);
    expect(result.endpoints).toHaveLength(2);
    expect(result.endpoints[0]).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3', 'qwen'],
      port: 11434,
      provider: 'ollama',
    });
    expect(result.endpoints[1]?.provider).toBeNull();
  });

  it('returns an empty payload when nothing is discovered', async () => {
    vi.mocked(service.discover).mockResolvedValue({
      endpoints: [],
      scannedAt: '2026-06-14T00:00:00.000Z',
      scannedHosts: ['localhost'],
    });
    const result = await resolver.discoverLocalModels(buildInfo(vi.fn()));
    expect(result.totalCount).toBe(0);
    expect(result.endpoints).toEqual([]);
  });

  it('hints the query as cacheable for 60s, per user', async () => {
    const setHint = vi.fn();
    await resolver.discoverLocalModels(buildInfo(setHint));
    expect(setHint).toHaveBeenCalledWith({ maxAge: 60, scope: 'PRIVATE' });
    expect(MODEL_DISCOVERY_CACHE_HINT).toEqual({
      maxAge: 60,
      scope: 'PRIVATE',
    });
  });

  it('hints the object-typed endpoints field so the operation stays cacheable', async () => {
    const setHint = vi.fn();
    const payload: DiscoverLocalModelsResult = {
      endpoints: [],
      scannedAt: '2026-06-14T00:00:00.000Z',
      scannedHosts: [],
      totalCount: 0,
    };
    expect(resolver.endpoints(payload, buildInfo(setHint))).toBe(
      payload.endpoints,
    );
    expect(setHint).toHaveBeenCalledWith(MODEL_DISCOVERY_CACHE_HINT);
  });
});
