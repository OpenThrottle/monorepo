/**
 * @description Shared constants for the OpenThrottle node client (embedding + vector search).
 */

/**
 * @description Max input characters passed to an embedding provider, task prefix included.
 * Shared by the local and Ollama providers so truncation (and therefore `content_hash`) does not
 * depend on the provider. Roughly 2k tokens: well inside nomic-embed-text's 8192-token window
 * while keeping CPU inference per row bounded.
 */
export const EMBEDDING_MAX_INPUT_CHARS = 8191;
