import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import { discoverModels } from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModelDiscoveryConfig } from './config/nestjs-model-discovery.config';
import { NestjsModelDiscoveryService } from './nestjs-model-discovery.service';

const realDiscoverModels = vi.hoisted(
  (): { fn?: typeof discoverModels } => ({}),
);

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  realDiscoverModels.fn = actual.discoverModels;
  return { ...actual, discoverModels: vi.fn(actual.discoverModels) };
});

const discoverModelsMock = vi.mocked(discoverModels);

/** Small config so each scan is a single probe we can count. */
const baseConfig: ModelDiscoveryConfig = {
  cacheTtlMs: 60_000,
  fingerprintTimeoutMs: 1500,
  hardTtlMs: 600_000,
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
  // Default to the real core so the fetch-counting tests below exercise the
  // actual scan; individual tests override the implementation as needed.
  discoverModelsMock.mockReset();
  if (realDiscoverModels.fn !== undefined) {
    discoverModelsMock.mockImplementation(realDiscoverModels.fn);
  }
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

  it('dedups concurrent cold-cache scans into one sweep', async () => {
    const service = await buildService(baseConfig);
    const [first, second] = await Promise.all([
      service.discover(),
      service.discover(),
    ]);
    expect(second).toBe(first);
    // A single probed port across one host = one fetch for the whole burst.
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it('serves the stale snapshot and refreshes in the background past the soft TTL', async () => {
    vi.useFakeTimers();
    try {
      const service = await buildService(baseConfig);
      const first = await service.discover();
      const callsAfterFirst = fetchMock.mock.calls.length;

      // Cross the soft TTL (60s) but stay within the hard TTL (600s).
      vi.advanceTimersByTime(120_000);
      const stale = await service.discover();

      // Same snapshot returned synchronously, and exactly one background sweep
      // kicked off (one probed port = one fetch).
      expect(stale).toBe(first);
      expect(fetchMock.mock.calls.length).toBe(callsAfterFirst + 1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks on a fresh scan once past the hard TTL', async () => {
    vi.useFakeTimers();
    try {
      const service = await buildService(baseConfig);
      const first = await service.discover();

      vi.advanceTimersByTime(700_000); // past hardTtlMs (600s)
      const refreshed = await service.discover();

      expect(refreshed).not.toBe(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws when the config namespace is missing', async () => {
    const configService = createMock<ConfigService>();
    vi.mocked(configService.get).mockReturnValue(undefined);
    const app = await Test.createTestingModule({
      providers: [
        NestjsModelDiscoveryService,
        { provide: ConfigService, useValue: configService },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const service = app.get(NestjsModelDiscoveryService);
    await expect(service.discover()).rejects.toThrow(/config namespace/);
  });

  it('never caches when cacheTtlMs is 0 (soft and hard both 0)', async () => {
    const service = await buildService({
      ...baseConfig,
      cacheTtlMs: 0,
      hardTtlMs: 0,
    });
    await service.discover();
    const callsAfterFirst = fetchMock.mock.calls.length;
    await service.discover();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });

  it('forwards every resolved config field into discoverModels', async () => {
    discoverModelsMock.mockResolvedValue({
      endpoints: [],
      scannedAt: '2026-01-01T00:00:00.000Z',
      scannedHosts: ['host-a'],
    });
    const config: ModelDiscoveryConfig = {
      cacheTtlMs: 60_000,
      fingerprintTimeoutMs: 1234,
      hardTtlMs: 600_000,
      hosts: ['host-a', 'host-b'],
      maxConcurrency: 7,
      ports: [11434, 1234],
      probeTimeoutMs: 4321,
    };
    const service = await buildService(config);
    await service.discover();

    expect(discoverModelsMock).toHaveBeenCalledTimes(1);
    const forwarded = discoverModelsMock.mock.calls[0][0];
    expect(forwarded.fingerprintTimeoutMs).toBe(config.fingerprintTimeoutMs);
    expect(forwarded.hosts).toEqual(config.hosts);
    expect(forwarded.maxConcurrency).toBe(config.maxConcurrency);
    expect(forwarded.ports).toEqual(config.ports);
    expect(forwarded.probeTimeoutMs).toBe(config.probeTimeoutMs);
    expect(typeof forwarded.scannedAt).toBe('string');
  });

  it('returns a populated endpoints result and logs the summary', async () => {
    const populated: DiscoveryResult = {
      endpoints: [
        {
          baseUrl: 'http://localhost:11434/v1',
          host: 'localhost',
          models: ['llama3'],
          port: 11434,
          provider: 'ollama',
        },
      ],
      scannedAt: '2026-01-01T00:00:00.000Z',
      scannedHosts: ['localhost', 'host.docker.internal'],
    };
    discoverModelsMock.mockResolvedValue(populated);
    const logger = createMock<LoggerService>();
    const configService = createMock<ConfigService>();
    vi.mocked(configService.get).mockReturnValue(baseConfig);
    const app = await Test.createTestingModule({
      providers: [
        NestjsModelDiscoveryService,
        { provide: ConfigService, useValue: configService },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    const service = app.get(NestjsModelDiscoveryService);

    const result = await service.discover();
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].models).toEqual(['llama3']);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    const summary = vi.mocked(logger.debug).mock.calls[0][0];
    expect(summary).toContain('1 endpoint(s)');
    expect(summary).toContain('2 host(s)');
  });
});
