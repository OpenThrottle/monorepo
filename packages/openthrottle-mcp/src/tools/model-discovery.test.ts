import { executeGraphql } from '@openthrottle/nodejs-graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { discoverLocalModelsToolHandler } from './model-discovery.js';

vi.mock('@openthrottle/nodejs-graphql', () => ({
  executeGraphql: vi.fn(),
}));

describe('discoverLocalModelsToolHandler', () => {
  beforeEach(() => {
    vi.mocked(executeGraphql).mockReset();
  });

  it('returns structured discovery content with mapped endpoints', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverLocalModels: {
        endpoints: [
          {
            baseUrl: 'http://localhost:11434/v1',
            host: 'localhost',
            models: ['llama3', 'qwen'],
            port: 11434,
            provider: 'ollama',
          },
        ],
        scannedAt: '2026-06-14T00:00:00.000Z',
        scannedHosts: ['localhost', 'host.docker.internal'],
        totalCount: 1,
      },
    });

    const result = await discoverLocalModelsToolHandler({});

    expect(result).toMatchObject({
      content: [
        {
          text: expect.stringContaining('http://localhost:11434/v1'),
          type: 'text',
        },
      ],
      structuredContent: {
        endpoints: [
          {
            baseUrl: 'http://localhost:11434/v1',
            host: 'localhost',
            models: ['llama3', 'qwen'],
            port: 11434,
            provider: 'ollama',
          },
        ],
        totalCount: 1,
      },
    });
  });

  it('reports no servers found for an empty result', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({
      discoverLocalModels: {
        endpoints: [],
        scannedAt: '2026-06-14T00:00:00.000Z',
        scannedHosts: ['localhost'],
        totalCount: 0,
      },
    });

    const result = await discoverLocalModelsToolHandler({});

    expect(result).toMatchObject({
      content: [
        {
          text: expect.stringContaining('No local model servers found'),
          type: 'text',
        },
      ],
      structuredContent: { totalCount: 0 },
    });
  });

  it('returns an error result when GraphQL returns nothing', async () => {
    vi.mocked(executeGraphql).mockResolvedValue({ discoverLocalModels: null });

    const result = await discoverLocalModelsToolHandler({});

    expect(result).toEqual({
      content: [
        { text: 'discover_local_models returned no result', type: 'text' },
      ],
      isError: true,
    });
  });

  it('returns an error result when GraphQL throws', async () => {
    vi.mocked(executeGraphql).mockRejectedValue(new Error('network down'));

    const result = await discoverLocalModelsToolHandler({});

    expect(result).toEqual({
      content: [
        { text: 'discover_local_models failed: network down', type: 'text' },
      ],
      isError: true,
    });
  });
});
