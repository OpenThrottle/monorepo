/**
 * @description Constants for the server's embedder (OT plan 165e86ef).
 */

/** @description Tables whose `embedding` column must match the configured dimension. */
export const EMBEDDING_TABLES = [
  'custom_prompt_embeddings',
  'documentation_embeddings',
  'plan_embeddings',
  'task_embeddings',
] as const;

/** @description Text embedded by the boot probe. */
export const EMBEDDER_PROBE_TEXT = 'OpenThrottle embedder boot probe';
