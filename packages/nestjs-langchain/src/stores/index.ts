import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type { ResilienceConfig } from '../config/resilience';
import {
  getEmbeddingModelDimensions,
  getEmbeddingsModel,
} from '../embeddings/index';

/**
 * ------------------------------------------------------------
 * @external https://js.langchain.com/docs/integrations/vectorstores/
 * @external https://js.langchain.com/docs/integrations/vectorstores/pgvector/
 *
 * @description Vector store: stores embedded data and performs similarity search.
 * ------------------------------------------------------------
 */
/**
 * @description Selects the embedding backend used to populate the vector store.
 * The store implementation itself is always PGVector; this value chooses which
 * embedding model (Ollama vs VertexAI) generates the vectors stored in it.
 */
export const vectorStoreProviders = ['Ollama', 'VertexAI'] as const;
export type VectorStoreProvider = (typeof vectorStoreProviders)[number];

interface VectorStoreConfig extends ResilienceConfig {
  connectionString: string;
  provider: VectorStoreProvider;
  tableName: string;
}

/**
 * @description A helper function for returning a vector store based on
 * the provider.
 */
export const getVectorStore = async (config: VectorStoreConfig) => {
  const { connectionString, maxConcurrency, maxRetries, provider, tableName } =
    config;

  let embeddings: EmbeddingsInterface | undefined;
  let dimensions: number | undefined;

  if (provider === 'Ollama') {
    const model = 'all-minilm';
    embeddings = getEmbeddingsModel({
      maxConcurrency,
      maxRetries,
      model,
      provider,
    });
    dimensions = getEmbeddingModelDimensions(model);
  }

  if (provider === 'VertexAI') {
    const model = 'text-embedding-005';
    embeddings = getEmbeddingsModel({
      maxConcurrency,
      maxRetries,
      model,
      provider,
    });
    dimensions = getEmbeddingModelDimensions(model);
  }

  if (!embeddings || dimensions === undefined) {
    throw new Error(`Invalid vector store provider`);
  }

  const vectorStore = await PGVectorStore.initialize(embeddings, {
    dimensions,
    postgresConnectionOptions: { connectionString },
    tableName: `${tableName}_vector_${dimensions}`,
  });

  return vectorStore;
};
