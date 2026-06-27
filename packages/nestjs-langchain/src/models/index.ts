// import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { ChatOllama } from '@langchain/ollama';
import {
  type ResilienceConfig,
  resolveResilienceConfig,
} from '../config/resilience';

/**
 * ------------------------------------------------------------
 * @external https://js.langchain.com/docs/integrations/chat/
 * @external https://js.langchain.com/docs/integrations/chat/google_vertex_ai/
 * @external https://js.langchain.com/docs/integrations/chat/ollama/
 *
 * @description Chat models: are essentially general models that have been
 * specifically fine-tuned for conversational tasks.
 * ------------------------------------------------------------
 */
export const chatModelProviders = ['Ollama', 'VertexAI'] as const;
export type ChatModelProvider = (typeof chatModelProviders)[number];

interface ChatModelConfig extends ResilienceConfig {
  projectId: string;
  provider: ChatModelProvider;
  temperature?: number;
  verbose?: boolean;
}

interface ChatModelConfigOllama extends ChatModelConfig {
  model: 'llama3.1' | 'llama3.2' | 'llama3.3';
  provider: 'Ollama';
}

interface ChatModelConfigVertexAI extends ChatModelConfig {
  model:
    | 'gemini-2.0-flash'
    | 'gemini-2.0-flash-lite'
    | 'gemini-2.5-flash'
    | 'gemini-2.5-flash-lite-preview-06-17'
    | 'gemini-2.5-flash-preview-05-20'
    | 'gemini-2.5-pro';
  provider: 'VertexAI';
}

/**
 * @description A helper function for returning a chat model based on the provider.
 */
export const getChatModel = (
  config: ChatModelConfigOllama | ChatModelConfigVertexAI,
) => {
  const {
    maxConcurrency,
    maxRetries,
    model,
    projectId,
    temperature = 0,
    verbose = false,
  } = config;
  const resilience = resolveResilienceConfig({ maxConcurrency, maxRetries });
  const optionsWithDefaults = { ...resilience, model, temperature, verbose };

  if (config.provider === 'Ollama') {
    const chatModel = new ChatOllama(optionsWithDefaults);

    return chatModel;
  }

  if (config.provider === 'VertexAI') {
    const chatModel = new ChatVertexAI({
      ...optionsWithDefaults,
      authOptions: { projectId },
      location: 'global',
    });

    return chatModel;
  }

  throw new Error(`Invalid chat model`);
};
