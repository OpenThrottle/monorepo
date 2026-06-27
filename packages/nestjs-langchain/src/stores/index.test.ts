import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getVectorStore } from './index';

const { getEmbeddingsModel, initialize } = vi.hoisted(() => ({
  getEmbeddingsModel: vi.fn(),
  initialize: vi.fn(),
}));

vi.mock('@langchain/community/vectorstores/pgvector', () => ({
  PGVectorStore: { initialize },
}));

vi.mock('../embeddings/index', async () => {
  // Keep the real dimension table so the store wiring is verified against the
  // actual model->dimension mapping rather than a stubbed value.
  const actual = await vi.importActual<typeof import('../embeddings/index')>(
    '../embeddings/index',
  );

  return {
    getEmbeddingModelDimensions: actual.getEmbeddingModelDimensions,
    getEmbeddingsModel,
  };
});

const fakeEmbeddings = { name: 'fake' };
const sentinelStore = { kind: 'pgvector' };

const baseConfig = {
  connectionString: 'postgres://localhost:5432/test',
  tableName: 'docs',
} as const;

beforeEach(() => {
  initialize.mockReset();
  initialize.mockResolvedValue(sentinelStore);
  getEmbeddingsModel.mockReset();
  getEmbeddingsModel.mockReturnValue(fakeEmbeddings);
});

describe('getVectorStore', () => {
  it('uses the all-minilm (384) embedding for the Ollama provider', async () => {
    const store = await getVectorStore({ ...baseConfig, provider: 'Ollama' });

    expect(store).toBe(sentinelStore);
    expect(getEmbeddingsModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'all-minilm', provider: 'Ollama' }),
    );

    const [embeddings, options] = initialize.mock.calls[0];
    expect(embeddings).toBe(fakeEmbeddings);
    expect(options.dimensions).toBe(384);
    expect(options.tableName).toBe('docs_vector_384');
    expect(options.postgresConnectionOptions).toEqual({
      connectionString: baseConfig.connectionString,
    });
  });

  it('uses the text-embedding-005 (768) embedding for the VertexAI provider', async () => {
    const store = await getVectorStore({ ...baseConfig, provider: 'VertexAI' });

    expect(store).toBe(sentinelStore);
    expect(getEmbeddingsModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'text-embedding-005',
        provider: 'VertexAI',
      }),
    );

    const [, options] = initialize.mock.calls[0];
    expect(options.dimensions).toBe(768);
    expect(options.tableName).toBe('docs_vector_768');
  });

  it('forwards resilience options to the embedding factory', async () => {
    await getVectorStore({
      ...baseConfig,
      maxConcurrency: 3,
      maxRetries: 1,
      provider: 'Ollama',
    });

    expect(getEmbeddingsModel).toHaveBeenCalledWith(
      expect.objectContaining({ maxConcurrency: 3, maxRetries: 1 }),
    );
  });

  it('throws for an unknown provider without initializing the store', async () => {
    // Exercise the runtime guard for a provider value that bypasses the union
    // type (e.g. coming from untyped config) without using a cast. Object.assign
    // injects the invalid value at runtime while keeping the declared type.
    const config: Parameters<typeof getVectorStore>[0] = {
      ...baseConfig,
      provider: 'VertexAI',
    };
    Object.assign(config, { provider: 'Unknown' });

    await expect(getVectorStore(config)).rejects.toThrow(
      /Invalid vector store provider/,
    );

    expect(initialize).not.toHaveBeenCalled();
  });
});
