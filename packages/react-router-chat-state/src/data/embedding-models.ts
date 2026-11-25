/**
 * @description Model-name patterns that mark an embedding-only model — one that
 * serves `/v1/embeddings` but cannot chat. Local discovery (`/v1/models`)
 * carries no capability data, so the composer recognises these by name: `embed`
 * anywhere covers `nomic-embed-text`, `mxbai-embed-large`,
 * `snowflake-arctic-embed`, `granite-embedding`, `embeddinggemma`,
 * `qwen3-embedding` and OpenAI's `text-embedding-*`; the rest are the
 * well-known embedding families whose names do not say so. Matched against the
 * model's last path segment, case-insensitively.
 *
 */
export const EMBEDDING_MODEL_NAME_PATTERNS: readonly RegExp[] = [
  /^all-minilm/i,
  /^bge-/i,
  /^paraphrase-multilingual/i,
  /embed/i,
];
