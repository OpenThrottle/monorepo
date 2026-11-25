/**
 * @description User-facing copy for the /search route, single-sourced so components and
 * their specs import the same constants.
 */
export const SEARCH_TOOLBAR_COPY = {
  codePlaceholder: 'Search code by what it does…',
  queryLabel: 'Search query',
  queryPlaceholder: 'Search plans, tasks and docs…',
  rankingHint: `Expand ranking details (scores, ids, position) on every result. Sets details=ranking in the URL and is kept when paging.`,
  rankingLabel: 'Ranking details',
  submitLabel: 'Search',
} as const;

export const SEARCH_INTRODUCTION_COPY = {
  description: `Search OpenThrottle's knowledge (plans, tasks and documentation) or switch to Code to search a repository's indexed source. Queries match by meaning, not just keywords: results blend semantic similarity with keyword matches, and fall back to keywords alone when semantic search is off. Open a result to preview it before you leave the page.`,
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

export const SEARCH_STATS_COPY = {
  corpus: {
    code: 'Code chunks indexed',
    documentation: 'Docs indexed',
    plan: 'Plans indexed',
    task: 'Tasks indexed',
  },
  mode: {
    hybrid: 'Hybrid',
    lexical: 'Keywords only',
    semantic: 'Semantic',
  },
  modeTitle: 'Ranking',
  reason: {
    embedder_busy: `The embedder was busy, so this query matched keywords only.`,
    embedder_dimension_mismatch: `The embedding model's dimensions do not match the index.`,
    embedder_provider_error: 'The embedding provider returned an error.',
    embedder_unconfigured: 'Semantic search is off: no embedding model.',
    no_embeddings: 'Nothing is embedded for the current model yet.',
  },
  results: 'Results',
  sources: {
    documentation: 'Docs',
    plan: 'Plans',
    task: 'Tasks',
  },
} as const;

export const SEARCH_TABLE_COPY = {
  actions: {
    menuAriaLabelPrefix: 'Actions for',
    preview: 'Preview',
  },
  columns: {
    relevance: 'Relevance',
    result: 'Result',
    type: 'Type',
  },
  empty: {
    noQuery: {
      description: `Type what you are looking for above. Results rank by meaning, so a description of the work finds it even without its exact words.`,
      title: 'Search to see results',
    },
    noResults: {
      description: `Nothing matched. Try fewer or different words, or check the stats panel for how much is indexed.`,
      title: 'No results',
    },
  },
} as const;

export const SEARCH_SCOPE_COPY = {
  ariaLabel: 'What to search',
  code: 'Code',
  knowledge: 'Knowledge',
  repositoryLabel: 'Repository',
} as const;

export const SEARCH_CODE_COPY = {
  indexLink: 'Open it in the IDE to index it',
  pagination: { resultLabel: 'matches' },
  states: {
    failed: {
      description: `The last index job failed, so results may be missing files. Re-index the repository to fill the gaps.`,
      title: 'Indexing failed',
    },
    gated: {
      description: `Code search needs an embedding model that may index code: a local or Ollama model, or a hosted one with CODE_EMBEDDINGS_ALLOW_HOSTED=true.`,
      title: 'Code search is off',
    },
    indexing: {
      description: `This repository is being indexed. Results cover what is indexed so far.`,
      title: 'Indexing in progress',
    },
    noRepository: {
      description: `Register a local checkout under Settings → Repositories to search its code.`,
      title: 'No repository registered',
    },
    notIndexed: {
      description: `This repository has no indexed code yet.`,
      title: 'Not indexed',
    },
  },
  stats: {
    indexedChunks: 'Indexed chunks',
    noQuery: '—',
    results: 'Matches',
    status: 'Index',
  },
  status: {
    failed: 'Failed',
    hostedOptInRequired: 'Hosted opt-in needed',
    indexing: 'Indexing',
    notIndexed: 'Not indexed',
    ready: 'Ready',
    unavailable: 'Unavailable',
  },
  table: {
    actions: { github: 'View on GitHub' },
    columns: { match: 'Match', score: 'Score' },
    empty: {
      noQuery: {
        description: `Describe the code you want, e.g. "where plan runs are settled". Matches rank by meaning.`,
        title: 'Search to see matches',
      },
      noResults: {
        description: `Nothing in this repository's index matched. Try other words.`,
        title: 'No matches',
      },
    },
  },
} as const;
