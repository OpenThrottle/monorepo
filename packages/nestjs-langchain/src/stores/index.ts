import { PGVectorStore } from '@langchain/community/dist/vectorstores/pgvector';
import { EmbeddingsInterface } from '@langchain/core/dist/embeddings';
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
export const vectorStoreProviders = ['Ollama', 'VertexAI'] as const;
export type VectorStoreProvider = (typeof vectorStoreProviders)[number];

interface VectorStoreConfig {
  connectionString: string;
  provider: VectorStoreProvider;
  tableName: string;
}

/**
 * @description A helper function for returning a vector store based on
 * the provider.
 */
export const getVectorStore = async (config: VectorStoreConfig) => {
  const { provider, connectionString, tableName } = config;

  let embeddings: EmbeddingsInterface | undefined;

  if (provider === 'Ollama') {
    embeddings = getEmbeddingsModel({
      model: 'all-minilm',
      provider,
    });
  }

  if (provider === 'VertexAI') {
    embeddings = getEmbeddingsModel({
      model: 'text-embedding-005',
      provider,
    });
  }

  if (!embeddings) {
    throw new Error(`Invalid vector store provider`);
  }

  const dimensions = getEmbeddingModelDimensions('gemini-embedding-001');
  const vectorStore = await PGVectorStore.initialize(embeddings, {
    dimensions,
    postgresConnectionOptions: { connectionString },
    tableName: `${tableName}_vector_${dimensions}`,
  });

  return vectorStore;
};
