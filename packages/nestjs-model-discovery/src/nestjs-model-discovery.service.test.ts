import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service';

/** Small config so each scan is a single probe we can count. */
const baseConfig: ModelDiscoveryConfig = {
  cacheTtlMs: 60_000,
  fingerprintTimeoutMs: 1500,
  hosts: ['localhost'],
  maxConcurrency: 10,
  ports: [9999],
  probeTimeoutMs: 3000,
};

async function buildService(
  config: ModelDiscoveryConfig,
): Promise<NestjsModelDiscoveryService> {
  const configService = createMock<ConfigService>();
  vi.mocked(configService.get).mockReturnValue(config);
  const app = await Test.createTestingModule({
    providers: [
      NestjsModelDiscoveryService,
      { provide: ConfigService, useValue: configService },
      { provide: LoggerService, useValue: createMock<LoggerService>() },
    ],
  }).compile();
  return app.get(NestjsModelDiscoveryService);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(new Response('', { status: 404 })));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NestjsModelDiscoveryService', () => {
  it('returns a typed DiscoveryResult and stamps scannedAt', async () => {
    const service = await buildService(baseConfig);
    const result = await service.discover();
    expect(result.scannedHosts).toEqual(['localhost']);
    expect(result.endpoints).toEqual([]);
    expect(typeof result.scannedAt).toBe('string');
  });

  it('serves the cached snapshot within the TTL window', async () => {
    const service = await buildService(baseConfig);
    const first = await service.discover();
    const callsAfterFirst = fetchMock.mock.calls.length;
    const second = await service.discover();
    expect(second).toBe(first);
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it('re-scans when forceRefresh is set', async () => {
    const service = await buildService(baseConfig);
    await service.discover();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await service.discover({ forceRefresh: true });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('re-scans after invalidate()', async () => {
    const service = await buildService(baseConfig);
    await service.discover();
    const callsAfterFirst = fetchMock.mock.calls.length;
    service.invalidate();
    await service.discover();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('never caches when cacheTtlMs is 0', async () => {
    const service = await buildService({ ...baseConfig, cacheTtlMs: 0 });
    await service.discover();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await service.discover();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
