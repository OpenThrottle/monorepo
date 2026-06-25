/**
 * @description Embedder abstraction for Cortex vector search. Provider choice is env-driven:
 * when OLLAMA_BASE_URL or OLLAMA_EMBEDDING_MODEL is set, uses Ollama; otherwise uses OpenAI (OPENAI_API_KEY).
 * Single API {@link embedQuery} used by semantic_search, plan/task create/update, and cortex:import.
 */

import OpenAI from 'openai';
import { EMBEDDING_MAX_INPUT_CHARS } from './constants.js';
import {
  embedWithOllama,
  isOllamaEmbeddingConfigured as isOllamaConfigured,
} from './ollama-embedding.js';

/** Re-export for callers that need to check if an embedding provider is available (e.g. cortex:import). */
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

/**
 * @description Embeds a single text using OpenAI. Requires OPENAI_API_KEY in env.
 * @returns 1536-dim embedding array, or undefined if API key missing or request fails.
 */
async function embedQueryWithOpenAI(
  text: string,
): Promise<number[] | undefined> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return undefined;
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.embeddings.create({
      input: text.slice(0, EMBEDDING_MAX_INPUT_CHARS),
      model: EMBEDDING_MODEL,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIM) {
      console.error(
        `[ai-mcp] OpenAI embedding returned unexpected shape (model=${EMBEDDING_MODEL}, expected dim=${EMBEDDING_DIM}); skipping embedding.`,
      );
      return undefined;
    }

    return embedding;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai-mcp] OpenAI embedding request failed: ${message}`);
    return undefined;
  }
}

/**
 * @description Embeds a single text using the env-configured provider (Ollama if OLLAMA_BASE_URL or OLLAMA_EMBEDDING_MODEL set; otherwise OpenAI). Used by semantic search, plan/task embeddings, and cortex:import.
 * @returns Embedding array (dimension is provider- and model-specific; use 1536-dim model with Ollama for Cortex schema), or undefined if provider unavailable or request fails.
 */
export async function embedQuery(text: string): Promise<number[] | undefined> {
  if (isOllamaConfigured()) {
    return embedWithOllama(text);
  }
  return embedQueryWithOpenAI(text);
}
