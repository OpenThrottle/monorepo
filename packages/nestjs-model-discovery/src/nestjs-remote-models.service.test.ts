import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RemoteModelsConfig } from './config/nestjs-remote-models.config';
import { NestjsRemoteModelsService } from './nestjs-remote-models.service';

const baseConfig: RemoteModelsConfig = {
  apiKey: 'sk-or-v1-test',
  baseUrl: 'https://openrouter.ai/api/v1',
  cacheTtlMs: 60_000,
  configured: true,
  hardTtlMs: 600_000,
  headers: { 'X-OpenRouter-Title': 'OpenThrottle' },
  timeoutMs: 10_000,
};

/** One catalog entry as the live gateway shapes it. */
function entry(id: string): Record<string, unknown> {
  return { context_length: 200_000, id, name: id };
}

async function buildService(
  config: RemoteModelsConfig,
): Promise<NestjsRemoteModelsService> {
  return (await buildServiceWithLogger(config)).service;
}

async function buildServiceWithLogger(config: RemoteModelsConfig): Promise<{
  logger: LoggerService;
  service: NestjsRemoteModelsService;
}> {
  const configService = createMock<ConfigService>();
  vi.mocked(configService.get).mockReturnValue(config);
  const logger = createMock<LoggerService>({ debug: vi.fn() });
  const app = await Test.createTestingModule({
    providers: [
      NestjsRemoteModelsService,
      { provide: ConfigService, useValue: configService },
      { provide: LoggerService, useValue: logger },
    ],
  }).compile();
  return { logger, service: app.get(NestjsRemoteModelsService) };
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Narrow an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Expected an object.');
  }
  return Object.fromEntries(Object.entries(value));
}

/** Headers the injected fetch saw on its first call. */
function requestHeaders(): Record<string, unknown> {
  const init = asRecord(fetchMock.mock.calls[0]?.[1]);
  return asRecord(init.headers);
}

beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ data: [entry('anthropic/claude-sonnet-5')] }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NestjsRemoteModelsService', () => {
  it('returns a typed catalog and stamps fetchedAt', async () => {
    const service = await buildService(baseConfig);

    const { catalog, configured } = await service.catalog();

    expect(configured).toBe(true);
    expect(catalog.provider).toBe('openrouter');
    expect(catalog.models).toEqual([
      {
        contextLength: 200_000,
        id: 'anthropic/claude-sonnet-5',
        name: 'anthropic/claude-sonnet-5',
        provider: 'openrouter',
      },
    ]);
    expect(typeof catalog.fetchedAt).toBe('string');
  });

  it('serves the cached catalog within the soft TTL rather than re-fetching', async () => {
    const service = await buildService(baseConfig);

    await service.catalog();
    await service.catalog();
    await service.catalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after invalidate()', async () => {
    const service = await buildService(baseConfig);

    await service.catalog();
    service.invalidate();
    await service.catalog();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-fetches when forceRefresh bypasses the cache', async () => {
    const service = await buildService(baseConfig);

    await service.catalog();
    await service.catalog({ forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent cold reads into a single fetch', async () => {
    const service = await buildService(baseConfig);

    await Promise.all([
      service.catalog(),
      service.catalog(),
      service.catalog(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports configured: false and still serves the public catalog with no key', async () => {
    const service = await buildService({
      ...baseConfig,
      apiKey: '',
      configured: false,
    });

    const { catalog, configured } = await service.catalog();

    expect(configured).toBe(false);
    // OpenRouter serves its catalog unauthenticated, so an unconfigured
    // instance can still populate the picker read-only — it just cannot chat.
    expect(catalog.models).toHaveLength(1);
    expect(requestHeaders()).not.toHaveProperty('authorization');
  });

  it('degrades a failing gateway to an empty catalog rather than throwing', async () => {
    fetchMock.mockImplementation(() =>
      Promise.reject(new Error('ECONNREFUSED')),
    );
    const service = await buildService(baseConfig);

    const { catalog } = await service.catalog();

    expect(catalog.models).toEqual([]);
    expect(catalog.provider).toBe('openrouter');
  });

  it('sends the configured attribution headers and bearer key', async () => {
    const service = await buildService(baseConfig);

    await service.catalog();

    expect(requestHeaders()).toMatchObject({
      'X-OpenRouter-Title': 'OpenThrottle',
      authorization: 'Bearer sk-or-v1-test',
    });
  });

  it('exposes chat credentials only when configured', async () => {
    const configured = await buildService(baseConfig);
    expect(configured.chatCredentials()).toEqual({
      apiKey: 'sk-or-v1-test',
      baseUrl: 'https://openrouter.ai/api/v1',
      headers: { 'X-OpenRouter-Title': 'OpenThrottle' },
    });

    const unconfigured = await buildService({
      ...baseConfig,
      apiKey: '',
      configured: false,
    });
    expect(unconfigured.chatCredentials()).toBeNull();
  });

  it('never writes the api key or base url into a log line', async () => {
    const { logger, service } = await buildServiceWithLogger({
      ...baseConfig,
      apiKey: 'sk-or-v1-super-secret',
      baseUrl: 'https://user:pass@openrouter.ai/api/v1',
    });

    await service.catalog();

    const logged = vi
      .mocked(logger.debug)
      .mock.calls.map((call) => JSON.stringify(call))
      .join(' ');
    expect(logged).not.toContain('sk-or-v1-super-secret');
    // The base URL is excluded too: an operator could have embedded credentials
    // in a proxy URL, so it is never echoed even though it is not itself a key.
    expect(logged).not.toContain('user:pass');
    // …but the log is still useful.
    expect(logged).toMatch(/openrouter/);
  });

  it('fails loud when the config namespace is not registered', async () => {
    const configService = createMock<ConfigService>();
    vi.mocked(configService.get).mockReturnValue(undefined);
    const app = await Test.createTestingModule({
      providers: [
        NestjsRemoteModelsService,
        { provide: ConfigService, useValue: configService },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const service = app.get(NestjsRemoteModelsService);

    await expect(service.catalog()).rejects.toThrow(
      /Missing 'remoteModels' config namespace/,
    );
  });
});
