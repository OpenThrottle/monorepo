/**
 * @description Shared constants for the Cortex node client (embedding + vector search).
 */

/**
 * @description Max input characters passed to an embedding provider. Unified across OpenAI and
 * Ollama paths so truncation is consistent regardless of provider. Roughly one token per ~4 chars,
 * comfortably under the text-embedding-3-small 8192-token context window.
 */
export const EMBEDDING_MAX_INPUT_CHARS = 8191;
