import {
  GoogleVertexAIEmbeddingsInput,
  VertexAIEmbeddings,
} from '@langchain/google-vertexai';
import { OllamaEmbeddings, OllamaEmbeddingsParams } from '@langchain/ollama';

/**
 * ------------------------------------------------------------
 * @external https://js.langchain.com/docs/integrations/text_embedding/
 * @external https://js.langchain.com/docs/integrations/text_embedding/google_vertex_ai/
 * @external https://js.langchain.com/docs/integrations/text_embedding/ollama/
 *
 * @description Embedding models: create a vector representation of a piece
 * of text.
 * ------------------------------------------------------------
 */
export const embeddingModelProviders = ['Ollama', 'VertexAI'] as const;
export type EmbeddingModelProvider = (typeof embeddingModelProviders)[number];

export interface EmbeddingModelConfig {
  provider: EmbeddingModelProvider;
  temperature?: number;
  verbose?: boolean;
}

interface EmbeddingModelConfigOllama extends EmbeddingModelConfig {
  model:
    | 'all-minilm' // 384 dimensions
    | 'mxbai-embed-large' // 1024 dimensions
    | 'nomic-embed-text'; // 768 dimensions
  provider: 'Ollama';
}

interface EmbeddingModelConfigVertexAI extends EmbeddingModelConfig {
  model:
    | 'gemini-embedding-001'
    | 'text-embedding-005'
    | 'text-multilingual-embedding-002';
  provider: 'VertexAI';
}

/**
 * @external https://js.langchain.com/docs/integrations/text_embedding/google_vertex_ai/
 * @external https://js.langchain.com/docs/integrations/text_embedding/
 *
 * @description A helper function for returning an embedding model based on the provider.
 */
export const getEmbeddingsModel = (
  config: EmbeddingModelConfigOllama | EmbeddingModelConfigVertexAI,
) => {
  const { provider, ...rest } = config;

  if (provider === 'Ollama') {
    const embeddingsModel = new OllamaEmbeddings(rest);

    return embeddingsModel satisfies GoogleVertexAIEmbeddingsInput;
  }

  if (provider === 'VertexAI') {
    const embeddingsModel = new VertexAIEmbeddings(rest);

    return embeddingsModel satisfies OllamaEmbeddingsParams;
  }

  throw new Error(`Invalid embedding model`);
};

type EmbeddingModel =
  | (
      | EmbeddingModelConfigOllama['model']
      | EmbeddingModelConfigVertexAI['model']
    )
  | (string & NonNullable<unknown>);

export const getEmbeddingModelDimensions = (model: EmbeddingModel) => {
  // console.log(`📐 getting dimensions for ${model}`);

  switch (model) {
    case 'all-minilm':
      return 384;
    case 'gemini-embedding-001':
      return 1536;
    case 'mxbai-embed-large':
      return 1024;
    case 'nomic-embed-text':
      return 768;
    case 'text-embedding-005':
      return 768;
    case 'text-multilingual-embedding-002':
      return 768;

    default:
      throw new Error(`Invalid embedding model: ${model}`);
  }
};
