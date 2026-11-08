/**
 * @description Code-index status values surfaced to the /ide Semantic tab. as-const object (no TS enum):
 * - unavailable: no embeddings provider configured (OPENAI_API_KEY / OLLAMA_*)
 * - indexing: a code-index job for this repository is active/waiting
 * - ready: the repository has indexed chunks
 * - notIndexed: provider configured, nothing indexed yet, no job running
 */
export const CODE_INDEX_STATUS = {
  indexing: 'indexing',
  notIndexed: 'notIndexed',
  ready: 'ready',
  unavailable: 'unavailable',
} as const;
