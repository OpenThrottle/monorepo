/**
 * @description User-facing copy for app-wide components, single-sourced so components and their
 * specs import the same constants.
 */
export const SEMANTIC_SEARCH_OFF_COPY = {
  command: 'pnpm run embeddings:download-model -- --verify',
  description: `These results match by keyword only: the semantic-search model is not on this machine. The server fetches it on its next boot, or run this now — no restart needed:`,
  dismissLabel: 'Dismiss semantic search notice',
  title: 'Semantic search is off',
} as const;

/** @description Copy for the docked conversations column. */
export const CONVERSATION_DOCK_COPY = {
  collapse: 'Collapse chats (⌘.)',
  region: 'Chats',
  show: 'Show chats (⌘.)',
} as const;
