/**
 * @description User-facing copy for the /search route, single-sourced so components and
 * their specs import the same constants.
 */
export const SEARCH_TOOLBAR_COPY = {
  queryLabel: 'Search query',
  queryPlaceholder: 'Search plans, tasks and docs…',
  rankingHint: `Expand ranking details (scores, ids, position) on every result. Sets details=ranking in the URL and is kept when paging.`,
  rankingLabel: 'Ranking details',
  submitLabel: 'Search',
} as const;

export const SEARCH_INTRODUCTION_COPY = {
  emptyHint: `Search plans, tasks and documentation by meaning, not just keywords. Results are ranked by semantic similarity; open a result to preview it before you leave the page.`,
  title: 'Search',
} as const;

export const SEARCH_RESULT_COPY = {
  fallbackTitle: {
    documentation: 'Documentation',
    plan: 'Plan',
    task: 'Task',
  },
  relevance: 'Relevance',
} as const;

export const SEARCH_PREVIEW_COPY = {
  closeHint: 'Esc to close',
  open: {
    documentation: 'View on GitHub',
    plan: 'Open plan',
    task: 'Open task',
  },
  previewLabel: 'Preview',
} as const;

export const SEARCH_PAGINATION_COPY = {
  pageSizeLabel: 'Results per page',
  resultLabel: 'results',
} as const;
