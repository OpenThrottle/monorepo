import { ChatVertexAI, VertexAIEmbeddings } from '@langchain/google-vertexai';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';

/**
 * @external https://js.langchain.com/docs/integrations/components
 * @external https://python.langchain.com/docs/integrations/components/
 *
 * @description Get the chat model to use, we limit these to two models:
 *
 *  - Ollama: Free and open-source model hosted locally
 *  - VertexAI: Google Cloud Platform (GCP)
 */

export type Model = 'ollama' | 'vertexai';
export type ModelProvider = 'ollama' | 'vertexai';

export interface GetChatModelOptions {
  model: Model;
  temperature?: number;
  verbose?: boolean;
}

/**
 * @external https://js.langchain.com/docs/integrations/chat/google_vertex_ai/
 * @external https://js.langchain.com/docs/integrations/chat/ollama/
 */
export const getChatModel = async (options: GetChatModelOptions) => {
  const { model, temperature = 0 } = options;

  if (model === 'ollama') {
    const chatModel = new ChatOllama({
      // model: 'llama3.1',
      model: 'llama3.2',
      temperature,
    });

    return chatModel;
  }

  if (model === 'vertexai') {
    const chatModel = new ChatVertexAI({
      authOptions: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      },
      // location: 'us-west1',
      model: 'gemini-2.5-flash-preview-05-20',
      temperature,
    });

    return chatModel;
  }

  throw new Error(`Invalid chat model: ${model}`);
};

export interface GetEmbeddingModelOptions {
  model: Model;
}

/**
 * @external https://js.langchain.com/docs/integrations/text_embedding/google_vertex_ai/
 * @external https://js.langchain.com/docs/integrations/text_embedding/
 */
export const getEmbeddingModal = (options: GetEmbeddingModelOptions) => {
  const { model } = options;

  if (model === 'ollama') {
    const embeddings = new OllamaEmbeddings({
      // Default value
      baseUrl: 'http://localhost:11434',
      model: 'mxbai-embed-large', // Default value
    });

    // FIXME: Lets get rid of this casting
    return embeddings;
  }

  if (model === 'vertexai') {
    const embeddings = new VertexAIEmbeddings({
      model: 'text-embedding-004',
      platformType: 'gcp',
    });

    // FIXME: Lets get rid of this casting
    return embeddings;
  }

  throw new Error(`Invalid embedding model: ${model}`);
};
