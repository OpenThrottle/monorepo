/**
 * @description Ollama embedding client for local embeddings. Calls POST /api/embeddings.
 * Additive: lives alongside OpenAI embedding; provider selection is env-driven (see embedder abstraction).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
 */

import { EMBEDDING_MAX_INPUT_CHARS } from './constants.ts';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

interface OllamaEmbeddingConfig {
  readonly baseUrl: string;
  readonly model: string;
}

/**
 * @description Returns Ollama embedding config from env when OLLAMA_BASE_URL or OLLAMA_EMBEDDING_MODEL is set.
 * @returns Config or undefined if neither env var is set (caller should use OpenAI path).
 */
function getOllamaEmbeddingConfig(): OllamaEmbeddingConfig | undefined {
  const baseUrlRaw = process.env.OLLAMA_BASE_URL?.trim();
  const modelRaw = process.env.OLLAMA_EMBEDDING_MODEL?.trim();

  if (!baseUrlRaw && !modelRaw) {
    return undefined;
  }

  const baseUrl = (baseUrlRaw ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
  const model = modelRaw ?? DEFAULT_OLLAMA_EMBEDDING_MODEL;

  return { baseUrl, model };
}

/**
 * @description Checks if Ollama should be used for embeddings (OLLAMA_BASE_URL or OLLAMA_EMBEDDING_MODEL set).
 */
export function isOllamaEmbeddingConfigured(): boolean {
  return (
    Boolean(process.env.OLLAMA_BASE_URL?.trim()) ||
    Boolean(process.env.OLLAMA_EMBEDDING_MODEL?.trim())
  );
}

/**
 * @description Embeds text via local Ollama API (POST /api/embeddings). Dimension is model-specific.
 * @param text Input text to embed.
 * @param config Optional config; when omitted uses getOllamaEmbeddingConfig() (env).
 * @returns Embedding array, or undefined if config missing or request fails.
 */
export async function embedWithOllama(
  text: string,
  config?: OllamaEmbeddingConfig,
): Promise<number[] | undefined> {
  const resolved = config ?? getOllamaEmbeddingConfig();
  if (!resolved) {
    return undefined;
  }

  const url = `${resolved.baseUrl}/api/embeddings`;
  const body = JSON.stringify({
    model: resolved.model,
    prompt: text.slice(0, EMBEDDING_MAX_INPUT_CHARS),
  });

  try {
    const response = await fetch(url, {
      body,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      console.error(
        `[ai-mcp] Ollama embedding request failed (model=${resolved.model}, status=${response.status}); skipping embedding.`,
      );
      return undefined;
    }

    const data: unknown = await response.json();
    const embedding =
      typeof data === 'object' && data !== null && 'embedding' in data
        ? data.embedding
        : undefined;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.error(
        `[ai-mcp] Ollama embedding returned empty result (model=${resolved.model}); skipping embedding.`,
      );
      return undefined;
    }

    return embedding;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai-mcp] Ollama embedding request failed: ${message}`);
    return undefined;
  }
}
