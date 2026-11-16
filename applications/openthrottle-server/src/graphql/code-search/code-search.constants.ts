/**
 * @description Code-index status values surfaced to the /ide Semantic tab. as-const object (no TS enum):
 * - unavailable: the embedder is unconfigured or its dimension mismatches the columns
 * - hostedOptInRequired: the embedder is hosted (openai/gemini) and CODE_EMBEDDINGS_ALLOW_HOSTED is
 *   not true, so code is never sent to it (OT plan 1c8b9a90)
 * - indexing: a code-index job for this repository is active/waiting
 * - ready: the repository has indexed chunks
 * - notIndexed: provider configured, nothing indexed yet, no job running
 */
export const CODE_INDEX_STATUS = {
  hostedOptInRequired: 'hostedOptInRequired',
  indexing: 'indexing',
  notIndexed: 'notIndexed',
  ready: 'ready',
  unavailable: 'unavailable',
} as const;
