import { EMBEDDING_MODEL_NAME_PATTERNS } from '../data/data.embedding-models';

/**
 * @description True when a discovered model id names an embedding-only model
 * (see {@link EMBEDDING_MODEL_NAME_PATTERNS}), which must never be offered as a
 * chat option or seeded into the composer. Ignores any registry/namespace
 * prefix (`hf.co/org/bge-m3` → `bge-m3`) and the `:tag` suffix is harmless.
 *
 */
export function isEmbeddingModelName(model: string): boolean {
  const baseName = model.slice(model.lastIndexOf('/') + 1);
  return EMBEDDING_MODEL_NAME_PATTERNS.some((pattern) => {
    return pattern.test(baseName);
  });
}
