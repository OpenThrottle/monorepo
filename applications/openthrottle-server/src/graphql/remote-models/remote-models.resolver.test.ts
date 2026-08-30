/**
 * @description Tests for RemoteModelsResolver: maps the cached catalog from the injected
 * NestjsRemoteModelsService into the ListResult-style payload, and proves the gateway API key never
 * appears in the response. The service is mocked — no network.
 */

import { createMock } from '@golevelup/ts-vitest';
import { NestjsRemoteModelsService } from '@openthrottle/nestjs-model-discovery';
import type { RemoteModelCatalog } from '@openthrottle/openthrottle-agentic-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RemoteModelsResolver } from './remote-models.resolver';

const CATALOG: RemoteModelCatalog = {
  fetchedAt: '2026-08-29T00:00:00.000Z',
  models: [
    {
      contextLength: 200_000,
      id: 'anthropic/claude-sonnet-5',
      name: 'Anthropic: Claude Sonnet 5',
      provider: 'openrouter',
    },
    {
      contextLength: 1_048_576,
      id: 'z-ai/glm-5.3-flash',
      name: 'Z.AI: GLM 5.3 Flash',
      provider: 'openrouter',
    },
  ],
  provider: 'openrouter',
};

describe('RemoteModelsResolver', () => {
  let service: NestjsRemoteModelsService;
  let resolver: RemoteModelsResolver;

  beforeEach(() => {
    service = createMock<NestjsRemoteModelsService>();
    vi.mocked(service.catalog).mockResolvedValue({
      catalog: CATALOG,
      configured: true,
    });
    resolver = new RemoteModelsResolver(service);
  });

  it('reads the cached catalog (no forceRefresh) and maps the payload', async () => {
    const result = await resolver.discoverRemoteModels();

    expect(service.catalog).toHaveBeenCalledWith();
    expect(result.configured).toBe(true);
    expect(result.provider).toBe('openrouter');
    expect(result.fetchedAt).toBe('2026-08-29T00:00:00.000Z');
    expect(result.totalCount).toBe(2);
    expect(result.models[0]).toEqual({
      contextLength: 200_000,
      id: 'anthropic/claude-sonnet-5',
      name: 'Anthropic: Claude Sonnet 5',
      provider: 'openrouter',
    });
  });

  it('returns configured: false with an empty list rather than throwing when unconfigured', async () => {
    vi.mocked(service.catalog).mockResolvedValue({
      catalog: { ...CATALOG, models: [] },
      configured: false,
    });

    const result = await resolver.discoverRemoteModels();

    expect(result.configured).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('never exposes anything key-shaped in the payload', async () => {
    const result = await resolver.discoverRemoteModels();

    // The response is the client's entire view of the provider; the only fact it
    // may learn about the operator key is the derived `configured` boolean.
    expect(Object.keys(result).sort()).toEqual([
      'configured',
      'fetchedAt',
      'models',
      'provider',
      'totalCount',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/sk-or|apiKey|api_key/i);
  });
});
